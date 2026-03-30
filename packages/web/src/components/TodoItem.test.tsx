/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Todo } from "shared";
import { MAX_TODO_TEXT_LENGTH } from "shared";
import { describe, expect, it, vi } from "vitest";
import { TodoItem } from "./TodoItem";

const incompleteTodo: Todo = {
  id: "1",
  text: "Buy milk",
  completed: false,
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-01T10:00:00.000Z",
};

const completedTodo: Todo = {
  id: "2",
  text: "Walk the dog",
  completed: true,
  createdAt: "2026-03-02T12:00:00.000Z",
  updatedAt: "2026-03-02T14:00:00.000Z",
};

function renderTodoItem(
  overrides: {
    todo?: typeof incompleteTodo;
    onUpdateText?: (id: string, text: string) => Promise<boolean>;
    pendingAction?: string | null;
  } = {},
) {
  const props = {
    todo: overrides.todo ?? incompleteTodo,
    onUpdateText: overrides.onUpdateText ?? vi.fn().mockResolvedValue(true),
    pendingAction: overrides.pendingAction ?? null,
  };

  return { ...render(<TodoItem {...props} />), props };
}

describe("TodoItem", () => {
  describe("read-only mode", () => {
    it("renders todo text as a clickable button by default", () => {
      renderTodoItem();

      expect(
        screen.getByRole("button", { name: incompleteTodo.text }),
      ).toBeInTheDocument();
    });

    it("renders checkbox with correct checked state", () => {
      renderTodoItem();

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toBeDisabled();
    });

    it("renders the creation date", () => {
      renderTodoItem();

      expect(
        screen.getByText(
          new Date(incompleteTodo.createdAt).toLocaleDateString(),
        ),
      ).toBeInTheDocument();
    });
  });

  describe("entering edit mode", () => {
    it("shows an input with current text on click", async () => {
      const user = userEvent.setup();
      renderTodoItem();

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );

      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(incompleteTodo.text);
      expect(input).toHaveFocus();
    });
  });

  describe("cancelling edit with Escape", () => {
    it("restores original text and exits edit mode", async () => {
      const user = userEvent.setup();
      renderTodoItem();

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Changed text");
      await user.keyboard("{Escape}");

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: incompleteTodo.text }),
      ).toBeInTheDocument();
    });
  });

  describe("saving with Enter", () => {
    it("calls onUpdateText with valid changed text", async () => {
      const user = userEvent.setup();
      const onUpdateText = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdateText });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Updated text{Enter}");

      expect(onUpdateText).toHaveBeenCalledWith(
        incompleteTodo.id,
        "Updated text",
      );
    });
  });

  describe("saving with blur (click-outside)", () => {
    it("calls onUpdateText with valid changed text", async () => {
      const user = userEvent.setup();
      const onUpdateText = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdateText });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Blurred text");
      await user.tab();

      expect(onUpdateText).toHaveBeenCalledWith(
        incompleteTodo.id,
        "Blurred text",
      );
    });
  });

  describe("unchanged text", () => {
    it("exits edit mode without API call when text is unchanged", async () => {
      const user = userEvent.setup();
      const onUpdateText = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdateText });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      await user.keyboard("{Enter}");

      expect(onUpdateText).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("inline validation", () => {
    it("shows error for empty text on Enter", async () => {
      const user = userEvent.setup();
      const onUpdateText = vi.fn();
      renderTodoItem({ onUpdateText });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.keyboard("{Enter}");

      expect(
        screen.getByText("Todo text must not be empty."),
      ).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(onUpdateText).not.toHaveBeenCalled();
    });

    it("shows error for too-long text on Enter", async () => {
      const user = userEvent.setup();
      const onUpdateText = vi.fn();
      renderTodoItem({ onUpdateText });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "a".repeat(MAX_TODO_TEXT_LENGTH + 1));
      await user.keyboard("{Enter}");

      expect(
        screen.getByText(
          `Todo text must be between 1 and ${MAX_TODO_TEXT_LENGTH} characters.`,
        ),
      ).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(onUpdateText).not.toHaveBeenCalled();
    });
  });

  describe("save failure", () => {
    it("keeps edit mode open with typed text preserved", async () => {
      const user = userEvent.setup();
      const onUpdateText = vi.fn().mockResolvedValue(false);
      renderTodoItem({ onUpdateText });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Failed save{Enter}");

      await waitFor(() => {
        expect(onUpdateText).toHaveBeenCalled();
      });

      expect(
        screen.getByRole("textbox", { name: "Edit todo text" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "Edit todo text" }),
      ).toHaveValue("Failed save");
    });
  });

  describe("pending state", () => {
    it("disables interactions when pendingAction is set", () => {
      renderTodoItem({ pendingAction: "edit" });

      expect(
        screen.queryByRole("button", { name: incompleteTodo.text }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(incompleteTodo.text)).toBeInTheDocument();
    });
  });

  describe("completed todo", () => {
    it("renders text as non-clickable span", () => {
      renderTodoItem({ todo: completedTodo });

      expect(
        screen.queryByRole("button", { name: completedTodo.text }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(completedTodo.text)).toBeInTheDocument();
    });
  });
});
