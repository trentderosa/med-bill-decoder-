import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SAMPLE_BILL_DISCLAIMER, SAMPLE_BILLS } from "@/data/sampleBills";
import { SampleBills } from "./SampleBills";

function billView() {
  return screen.getByRole("article");
}

describe("SampleBills", () => {
  it("renders every sample as a button with no 'Coming soon' label", () => {
    render(<SampleBills />);
    expect(screen.getAllByRole("button")).toHaveLength(SAMPLE_BILLS.length);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it.each(SAMPLE_BILLS.map((b) => [b.title, b] as const))(
    "clicking %s shows that bill",
    async (title, bill) => {
      const user = userEvent.setup();
      render(<SampleBills />);
      const button = screen.getByRole("button", { name: new RegExp(title, "i") });
      await user.click(button);

      expect(button).toHaveAttribute("aria-pressed", "true");
      const view = within(billView());
      expect(view.getByRole("heading", { name: title })).toHaveFocus();
      expect(view.getByText(bill.patient.name)).toBeInTheDocument();
      expect(view.getByText(bill.provider.name)).toBeInTheDocument();
      expect(view.getByText(SAMPLE_BILL_DISCLAIMER)).toBeInTheDocument();
      for (const item of bill.lineItems) {
        expect(view.getAllByText(item.code).length).toBeGreaterThan(0);
        if (item.expectedFlag) {
          expect(view.getAllByText(item.expectedFlag.message, { exact: false }).length).toBe(1);
        }
      }
      for (const source of bill.sources) {
        const link = view.getByRole("link", { name: `${source.label} (opens in a new tab)` });
        expect(link).toHaveAttribute("href", source.url);
      }
    },
  );

  it("switches bills and keeps only one pressed", async () => {
    const user = userEvent.setup();
    render(<SampleBills />);
    await user.click(screen.getByRole("button", { name: /duplicate charge/i }));
    await user.click(screen.getByRole("button", { name: /clean bill/i }));

    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    const view = within(billView());
    expect(view.getByText("Morgan Sampleton")).toBeInTheDocument();
    expect(view.queryByText("Jordan Fake-Ellis")).not.toBeInTheDocument();
    expect(view.getByText("No issues flagged")).toBeInTheDocument();
  });

  it("shows the unbundling message with CMS-guidance wording", async () => {
    const user = userEvent.setup();
    render(<SampleBills />);
    await user.click(screen.getByRole("button", { name: /unbundled procedure/i }));
    expect(within(billView()).getByText(/commonly bundled per CMS guidance/)).toBeInTheDocument();
  });

  it("does not touch localStorage, sessionStorage, or the network", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<SampleBills />);
    for (const button of screen.getAllByRole("button")) await user.click(button);

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    vi.restoreAllMocks();
  });
});
