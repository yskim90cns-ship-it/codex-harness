import { render, screen } from "@testing-library/react";

import Home from "./page";

describe("Home", () => {
  it("renders the live translator shell", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Live Voice Translator" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Original transcript")).toBeInTheDocument();
    expect(screen.getByText("Translation")).toBeInTheDocument();
  });
});
