import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  describe("render", () => {
    it("renders the app", () => {
      render(<App />);

      expect(
        screen.getByRole("heading", { name: /get started/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/todo max length: 200 characters\./i),
      ).toBeInTheDocument();
    });
  });
});
