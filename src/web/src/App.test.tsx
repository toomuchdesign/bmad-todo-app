import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import App from "./App";

it("renders the app", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: /get started/i }),
  ).toBeInTheDocument();
});
