/// <reference types="@testing-library/jest-dom/vitest" />
import { MAX_TODO_TEXT_LENGTH } from "@bmad-todo/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddTodoForm } from "./AddTodoForm";

describe("AddTodoForm", () => {
  describe("rendering", () => {
    it("renders a text input and an Add button", () => {
      const onSubmit = vi.fn();

      render(<AddTodoForm onSubmit={onSubmit} />);

      expect(
        screen.getByRole("textbox", { name: "New todo text" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    });
  });

  describe("empty/whitespace submission", () => {
    it("shows inline validation and preserves input for empty text", () => {
      const onSubmit = vi.fn();
      render(<AddTodoForm onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(
        screen.getByText("Todo text must not be empty."),
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("shows inline validation and preserves input for whitespace-only text", () => {
      const onSubmit = vi.fn();
      render(<AddTodoForm onSubmit={onSubmit} />);
      const input = screen.getByRole("textbox", { name: "New todo text" });

      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(
        screen.getByText("Todo text must not be empty."),
      ).toBeInTheDocument();
      expect(input).toHaveValue("   ");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("too-long submission", () => {
    it("shows inline validation with length constraint and preserves input", () => {
      const onSubmit = vi.fn();
      render(<AddTodoForm onSubmit={onSubmit} />);
      const input = screen.getByRole("textbox", { name: "New todo text" });
      const longText = "a".repeat(MAX_TODO_TEXT_LENGTH + 1);

      fireEvent.change(input, { target: { value: longText } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(
        screen.getByText(
          `Todo text must be between 1 and ${MAX_TODO_TEXT_LENGTH} characters.`,
        ),
      ).toBeInTheDocument();
      expect(input).toHaveValue(longText);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("valid submission", () => {
    it("calls onSubmit and shows disabled button while pending", async () => {
      let resolveSubmit: ((value: boolean) => void) | undefined;
      const onSubmit = vi.fn().mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveSubmit = resolve;
        }),
      );
      render(<AddTodoForm onSubmit={onSubmit} />);
      const input = screen.getByRole("textbox", { name: "New todo text" });

      fireEvent.change(input, { target: { value: "Buy milk" } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(onSubmit).toHaveBeenCalledWith("Buy milk");
      expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

      resolveSubmit?.(true);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
      });
    });
  });

  describe("successful submission", () => {
    it("clears input and refocuses", async () => {
      const onSubmit = vi.fn().mockResolvedValue(true);
      render(<AddTodoForm onSubmit={onSubmit} />);
      const input = screen.getByRole("textbox", { name: "New todo text" });

      fireEvent.change(input, { target: { value: "Buy milk" } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(input).toHaveValue("");
        expect(input).toHaveFocus();
      });
    });
  });

  describe("failed submission", () => {
    it("preserves input text", async () => {
      const onSubmit = vi.fn().mockResolvedValue(false);
      render(<AddTodoForm onSubmit={onSubmit} />);
      const input = screen.getByRole("textbox", { name: "New todo text" });

      fireEvent.change(input, { target: { value: "Buy milk" } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
      });
      expect(input).toHaveValue("Buy milk");
    });
  });

  describe("validation clearing", () => {
    it("clears inline validation on next input change", () => {
      const onSubmit = vi.fn();
      render(<AddTodoForm onSubmit={onSubmit} />);
      const input = screen.getByRole("textbox", { name: "New todo text" });

      fireEvent.click(screen.getByRole("button", { name: "Add" }));
      expect(
        screen.getByText("Todo text must not be empty."),
      ).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "a" } });

      expect(
        screen.queryByText("Todo text must not be empty."),
      ).not.toBeInTheDocument();
    });
  });
});
