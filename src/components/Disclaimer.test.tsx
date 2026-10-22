import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import { Disclaimer } from "./Disclaimer";

describe("Disclaimer", () => {
  it("renders the full disclaimer text", () => {
    render(<Disclaimer />);
    expect(
      screen.getByText(
        "Demo only. Use fake sample bills — never upload real patient information. Nothing is stored. Educational, not legal or medical advice.",
      ),
    ).toBeInTheDocument();
  });
});

describe("HomePage", () => {
  it("renders the hero, a disabled upload area, and sample bills", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /understand your medical bill/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /coming soon/i })).toBeDisabled();
    expect(screen.getByLabelText(/upload a medical bill or eob/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /duplicate charge/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clean bill/i })).toBeInTheDocument();
  });
});
