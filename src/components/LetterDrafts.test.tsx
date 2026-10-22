import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SAMPLE_BILLS } from "@/data/sampleBills";
import { LETTER_LABEL, NOT_OFFICIAL_NOTE, buildLetters } from "@/lib/letters";
import { LetterDrafts } from "./LetterDrafts";
import { SampleBills } from "./SampleBills";

const byId = (id: string) => SAMPLE_BILLS.find((b) => b.id === id)!;

function letterText() {
  return screen.getByLabelText(/letter text$/);
}

// jsdom has no object URLs, so stub them directly and put the originals back.
const ORIGINAL_URLS = {
  createObjectURL: URL.createObjectURL,
  revokeObjectURL: URL.revokeObjectURL,
};

function stubObjectUrls(createObjectURL: (blob: Blob) => string, revokeObjectURL = vi.fn()) {
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  return revokeObjectURL;
}

afterEach(() => {
  Object.assign(URL, ORIGINAL_URLS);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LetterDrafts", () => {
  it.each(SAMPLE_BILLS.filter((b) => buildLetters(b).length > 0).map((b) => [b.title, b] as const))(
    "%s lists its letters and shows each one's full text",
    async (_title, bill) => {
      const user = userEvent.setup();
      render(<LetterDrafts bill={bill} />);
      const letters = buildLetters(bill);
      const list = within(screen.getByRole("list", { name: "Available letters" }));
      expect(list.getAllByRole("button")).toHaveLength(letters.length);

      for (const letter of letters) {
        await user.click(list.getByRole("button", { name: new RegExp(letter.title) }));
        expect(list.getByRole("button", { name: new RegExp(letter.title) })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        expect(letterText()).toHaveTextContent(letter.text.split("\n")[0]!);
        expect(letterText().textContent).toBe(letter.text);
        expect(screen.getByText(LETTER_LABEL)).toBeInTheDocument();
        expect(screen.getByText(NOT_OFFICIAL_NOTE)).toBeInTheDocument();
        for (const deadline of letter.deadlines) {
          const link = screen.getByRole("link", {
            name: `${deadline.citation} (opens in a new tab)`,
          });
          expect(link).toHaveAttribute("href", deadline.source.url);
        }
        if (!letter.deadlines.length) {
          expect(screen.getByText(letter.noDeadlineNote!)).toBeInTheDocument();
        }
      }
    },
  );

  it("shows a calm 'No letter needed' note for the clean bill", () => {
    render(<LetterDrafts bill={byId("clean-bill")} />);
    expect(screen.getByText(/No letter needed/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/letter text$/)).not.toBeInTheDocument();
  });

  it("copies the letter with navigator.clipboard and announces it", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText } as unknown as Clipboard);
    const bill = byId("surprise-balance-bill");
    render(<LetterDrafts bill={bill} />);

    await user.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(writeText).toHaveBeenCalledWith(buildLetters(bill)[0]!.text);
    expect(screen.getByRole("status")).toHaveTextContent("Copied the letter to your clipboard.");
  });

  it("falls back to selecting the text when the clipboard fails", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText } as unknown as Clipboard);
    render(<LetterDrafts bill={byId("duplicate-charge")} />);

    await user.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Couldn't copy automatically/);
    expect(window.getSelection()?.toString()).toBe(buildLetters(byId("duplicate-charge"))[0]!.text);
  });

  it("falls back when there is no clipboard API", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as unknown as Clipboard);
    render(<LetterDrafts bill={byId("duplicate-charge")} />);

    await user.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Couldn't copy automatically/);
  });

  it("downloads a .txt blob of the letter, client-side", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:letter");
    const revokeObjectURL = stubObjectUrls(createObjectURL);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.href).toBe("blob:letter");
      expect(this.download).toBe("gfe-dispute-over-good-faith-estimate.txt");
    });
    const bill = byId("over-good-faith-estimate");
    render(<LetterDrafts bill={bill} />);

    await user.click(screen.getByRole("button", { name: "Download .txt" }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]![0];
    expect(blob.type).toBe("text/plain;charset=utf-8");
    expect(await blob.text()).toBe(buildLetters(bill)[0]!.text);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:letter");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Downloaded gfe-dispute-over-good-faith-estimate.txt.",
    );
  });

  it("prints only the letter and cleans up afterward", async () => {
    const user = userEvent.setup();
    const print = vi.fn(() => {
      expect(document.documentElement.dataset.printing).toBe("letter");
    });
    vi.stubGlobal("print", print);
    render(<LetterDrafts bill={byId("duplicate-charge")} />);

    await user.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.printing).toBeUndefined();
    expect(letterText()).toHaveAttribute("data-letter-text");
  });

  it("resets to the new bill's letters when switching bills", async () => {
    const user = userEvent.setup();
    render(<SampleBills />);
    await user.click(screen.getByRole("button", { name: /surprise balance bill/i }));
    await user.click(screen.getByRole("button", { name: /Insurer appeal/ }));
    await user.click(screen.getByRole("button", { name: /over the good faith estimate/i }));
    expect(screen.getByRole("button", { name: /GFE dispute/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(letterText()).toHaveTextContent("Lee Imaginary");
    expect(letterText()).not.toHaveTextContent("Sam Example-Ruiz");
  });

  it("does not touch localStorage, sessionStorage, or the network", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText } as unknown as Clipboard);
    stubObjectUrls(() => "blob:letter");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("print", () => {});
    const user = userEvent.setup();
    render(<SampleBills />);

    for (const bill of SAMPLE_BILLS) {
      await user.click(screen.getByRole("button", { name: new RegExp(bill.title, "i") }));
      for (const letter of buildLetters(bill)) {
        await user.click(screen.getByRole("button", { name: new RegExp(letter.title) }));
        for (const name of ["Copy to clipboard", "Download .txt", "Print"]) {
          await user.click(screen.getByRole("button", { name }));
        }
      }
    }
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });
});
