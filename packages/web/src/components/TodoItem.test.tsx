/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Todo } from "shared";
import { MAX_TODO_TEXT_LENGTH } from "shared";
import { describe, expect, it, vi } from "vitest";
import type { TodoUpdatableFields } from "../hooks/useTodos";
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
    onUpdate?: (id: string, fields: TodoUpdatableFields) => Promise<boolean>;
    onDelete?: (id: string) => Promise<boolean>;
  } = {},
) {
  const props = {
    todo: overrides.todo ?? incompleteTodo,
    onUpdate: overrides.onUpdate ?? vi.fn().mockResolvedValue(true),
    onDelete: overrides.onDelete ?? vi.fn().mockResolvedValue(true),
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
      expect(checkbox).toBeEnabled();
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
    it("shows an input with current text", async () => {
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
    it("calls onUpdate with text field for valid changed text", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Updated text{Enter}");

      expect(onUpdate).toHaveBeenCalledWith(incompleteTodo.id, {
        text: "Updated text",
      });
    });
  });

  describe("saving with blur (click-outside)", () => {
    it("calls onUpdate with text field for valid changed text", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Blurred text");
      await user.tab();

      expect(onUpdate).toHaveBeenCalledWith(incompleteTodo.id, {
        text: "Blurred text",
      });
    });
  });

  describe("unchanged text", () => {
    it("exits edit mode without API call", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      await user.keyboard("{Enter}");

      expect(onUpdate).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("inline validation", () => {
    describe("on Enter", () => {
      it("shows error for empty text", async () => {
        const user = userEvent.setup();
        const onUpdate = vi.fn();
        renderTodoItem({ onUpdate });

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
        expect(onUpdate).not.toHaveBeenCalled();
      });

      it("shows error for too-long text", async () => {
        const user = userEvent.setup();
        const onUpdate = vi.fn();
        renderTodoItem({ onUpdate });

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
        expect(onUpdate).not.toHaveBeenCalled();
      });
    });
  });

  describe("save failure", () => {
    it("keeps edit mode open with typed text preserved", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(false);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.text }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Failed save{Enter}");

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });

      expect(
        screen.getByRole("textbox", { name: "Edit todo text" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "Edit todo text" }),
      ).toHaveValue("Failed save");
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

    it("renders with checked checkbox", () => {
      renderTodoItem({ todo: completedTodo });

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });
  });

  describe("toggle completion", () => {
    it("calls onUpdate with completed field", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(screen.getByRole("checkbox"));

      expect(onUpdate).toHaveBeenCalledWith(incompleteTodo.id, {
        completed: true,
      });
    });
  });

  describe("delete button", () => {
    it("renders a Delete button with accessible label", () => {
      renderTodoItem();

      const button = screen.getByRole("button", {
        name: `Delete ${incompleteTodo.text}`,
      });
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it("calls onDelete with todo ID", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onDelete });

      await user.click(
        screen.getByRole("button", { name: `Delete ${incompleteTodo.text}` }),
      );

      expect(onDelete).toHaveBeenCalledWith(incompleteTodo.id);
    });
  });
});
