/// <reference types="@testing-library/jest-dom/vitest" />

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from ".";

describe("Button", () => {
  describe("variants", () => {
    it.each([
      { variant: "primary" as const },
      { variant: "ghost" as const },
    ])("renders $variant variant", ({ variant }) => {
      render(<Button variant={variant}>Click me</Button>);

      const actual = screen.getByRole("button", { name: "Click me" });

      expect(actual).toBeInTheDocument();
    });
  });

  describe("disabled", () => {
    it("disables the button", () => {
      render(
        <Button variant="primary" disabled>
          Save
        </Button>,
      );

      const actual = screen.getByRole("button", { name: "Save" });

      expect(actual).toBeDisabled();
    });
  });

  describe("loading", () => {
    it("renders loadingText and disables the button", () => {
      render(
        <Button variant="primary" loading loadingText="Saving…">
          Save
        </Button>,
      );

      const actual = screen.getByRole("button", { name: "Saving…" });

      expect(actual).toBeDisabled();
    });
  });

  describe("onClick", () => {
    it("fires onClick handler when clicked", () => {
      const onClick = vi.fn();
      render(
        <Button variant="primary" onClick={onClick}>
          Go
        </Button>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Go" }));

      expect(onClick).toHaveBeenCalledOnce();
    });
  });
});
