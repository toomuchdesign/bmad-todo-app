/// <reference types="@testing-library/jest-dom/vitest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MAX_TODO_TITLE_LENGTH } from "shared";
import { describe, expect, it, vi } from "vitest";

import { AddTodoCard } from ".";

describe("AddTodoCard", () => {
  describe("when expandOnFocus is false (always expanded)", () => {
    describe("rendering", () => {
      it("renders a title input, a description textarea, and an Add button", () => {
        const onSubmit = vi.fn();

        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);

        expect(
          screen.getByRole("textbox", { name: "New todo title" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("textbox", { name: "New todo description" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
      });
    });

    describe("empty submission", () => {
      it("shows inline validation and preserves input for empty title", () => {
        const onSubmit = vi.fn();
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);

        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        expect(
          screen.getByText("Title must not be empty."),
        ).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
      });

      it("shows inline validation and preserves input for whitespace-only title", () => {
        const onSubmit = vi.fn();
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);
        const input = screen.getByRole("textbox", { name: "New todo title" });

        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        expect(
          screen.getByText("Title must not be empty."),
        ).toBeInTheDocument();
        expect(input).toHaveValue("   ");
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    describe("too-long submission", () => {
      it("shows inline validation with length constraint and preserves input", () => {
        const onSubmit = vi.fn();
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);
        const input = screen.getByRole("textbox", { name: "New todo title" });
        const longText = "a".repeat(MAX_TODO_TITLE_LENGTH + 1);

        fireEvent.change(input, { target: { value: longText } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        expect(
          screen.getByText(
            `Title must be between 1 and ${MAX_TODO_TITLE_LENGTH} characters.`,
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
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);
        const input = screen.getByRole("textbox", { name: "New todo title" });

        fireEvent.change(input, { target: { value: "Buy milk" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        expect(onSubmit).toHaveBeenCalledWith({ title: "Buy milk" });
        // Button swaps to loading label and is disabled while submitting
        expect(screen.getByRole("button", { name: /adding/i })).toBeDisabled();

        resolveSubmit?.(true);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
        });
      });

      it("includes text when description is provided", async () => {
        const onSubmit = vi.fn().mockResolvedValue(true);
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);

        const titleInput = screen.getByRole("textbox", {
          name: "New todo title",
        });
        const textInput = screen.getByRole("textbox", {
          name: "New todo description",
        });

        fireEvent.change(titleInput, { target: { value: "Buy milk" } });
        fireEvent.change(textInput, {
          target: { value: "Whole milk from the store" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        await waitFor(() => {
          expect(onSubmit).toHaveBeenCalledWith({
            title: "Buy milk",
            text: "Whole milk from the store",
          });
        });
      });
    });

    describe("successful submission", () => {
      it("clears both inputs and refocuses title", async () => {
        const onSubmit = vi.fn().mockResolvedValue(true);
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);
        const titleInput = screen.getByRole("textbox", {
          name: "New todo title",
        });
        const textInput = screen.getByRole("textbox", {
          name: "New todo description",
        });

        fireEvent.change(titleInput, { target: { value: "Buy milk" } });
        fireEvent.change(textInput, { target: { value: "Details" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        await waitFor(() => {
          expect(titleInput).toHaveValue("");
          expect(textInput).toHaveValue("");
          expect(titleInput).toHaveFocus();
        });
      });
    });

    describe("failed submission", () => {
      it("preserves input text", async () => {
        const onSubmit = vi.fn().mockResolvedValue(false);
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);
        const input = screen.getByRole("textbox", { name: "New todo title" });

        fireEvent.change(input, { target: { value: "Buy milk" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        await waitFor(() => {
          expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
        });
        expect(input).toHaveValue("Buy milk");
      });
    });

    describe("Ctrl/Cmd+Enter in description textarea", () => {
      it.each([
        { mod: "ctrlKey", label: "Ctrl+Enter" },
        { mod: "metaKey", label: "Cmd+Enter" },
      ])("submits the form on $label", async ({ mod }) => {
        const onSubmit = vi.fn().mockResolvedValue(true);
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);

        const titleInput = screen.getByRole("textbox", {
          name: "New todo title",
        });
        const textInput = screen.getByRole("textbox", {
          name: "New todo description",
        });

        fireEvent.change(titleInput, { target: { value: "Quick add" } });
        fireEvent.change(textInput, { target: { value: "Some details" } });
        fireEvent.keyDown(textInput, { key: "Enter", [mod]: true });

        await waitFor(() => {
          expect(onSubmit).toHaveBeenCalledWith({
            title: "Quick add",
            text: "Some details",
          });
        });
      });
    });

    describe("validation clearing", () => {
      it("clears inline validation on next title input change", () => {
        const onSubmit = vi.fn();
        render(<AddTodoCard onSubmit={onSubmit} expandOnFocus={false} />);
        const input = screen.getByRole("textbox", { name: "New todo title" });

        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        expect(
          screen.getByText("Title must not be empty."),
        ).toBeInTheDocument();

        fireEvent.change(input, { target: { value: "a" } });

        expect(
          screen.queryByText("Title must not be empty."),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("expandOnFocus (default true)", () => {
    describe("idle state", () => {
      it("shows only title input (no textarea, no Add button)", () => {
        render(<AddTodoCard onSubmit={vi.fn()} />);

        expect(
          screen.getByRole("textbox", { name: "New todo title" }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("textbox", { name: "New todo description" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Add" }),
        ).not.toBeInTheDocument();
      });
    });

    describe("on title focus", () => {
      it("expands card (textarea and Add button appear)", async () => {
        const user = userEvent.setup();
        render(<AddTodoCard onSubmit={vi.fn()} />);

        await user.click(
          screen.getByRole("textbox", { name: "New todo title" }),
        );

        expect(
          screen.getByRole("textbox", { name: "New todo description" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
      });
    });

    describe("on blur with empty title", () => {
      it("collapses card", async () => {
        const user = userEvent.setup();
        render(
          <>
            <AddTodoCard onSubmit={vi.fn()} />
            <button type="button">outside</button>
          </>,
        );

        await user.click(
          screen.getByRole("textbox", { name: "New todo title" }),
        );
        // Sanity check: card expanded
        expect(
          screen.getByRole("textbox", { name: "New todo description" }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "outside" }));

        expect(
          screen.queryByRole("textbox", { name: "New todo description" }),
        ).not.toBeInTheDocument();
      });
    });

    describe("on blur with title content", () => {
      it("stays expanded", async () => {
        const user = userEvent.setup();
        render(
          <>
            <AddTodoCard onSubmit={vi.fn()} />
            <button type="button">outside</button>
          </>,
        );

        const titleInput = screen.getByRole("textbox", {
          name: "New todo title",
        });
        await user.click(titleInput);
        await user.type(titleInput, "Buy milk");

        await user.click(screen.getByRole("button", { name: "outside" }));

        expect(
          screen.getByRole("textbox", { name: "New todo description" }),
        ).toBeInTheDocument();
      });
    });

    describe("cancel button", () => {
      it("clears fields and collapses card", async () => {
        const user = userEvent.setup();
        render(<AddTodoCard onSubmit={vi.fn()} />);

        const titleInput = screen.getByRole("textbox", {
          name: "New todo title",
        });
        await user.click(titleInput);
        await user.type(titleInput, "Buy milk");

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(titleInput).toHaveValue("");
        expect(
          screen.queryByRole("textbox", { name: "New todo description" }),
        ).not.toBeInTheDocument();
      });
    });
  });
});
