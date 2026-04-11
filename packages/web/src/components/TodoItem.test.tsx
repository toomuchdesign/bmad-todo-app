/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MAX_TODO_TITLE_LENGTH, type Todo } from "shared";
import { describe, expect, it, vi } from "vitest";
import type { TodoUpdatableFields } from "../contracts";
import { TodoItem } from "./TodoItem";

const incompleteTodo: Todo = {
  id: "1",
  title: "Buy milk",
  text: "",
  completed: false,
  userId: "test-user-id",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-01T10:00:00.000Z",
};

const incompleteTodoWithDescription: Todo = {
  id: "1",
  title: "Buy milk",
  text: "Whole milk from the store",
  completed: false,
  userId: "test-user-id",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-01T10:00:00.000Z",
};

const completedTodo: Todo = {
  id: "2",
  title: "Walk the dog",
  text: "Take the usual route through the park",
  completed: true,
  userId: "test-user-id",
  createdAt: "2026-03-02T12:00:00.000Z",
  updatedAt: "2026-03-02T14:00:00.000Z",
};

function renderTodoItem(
  overrides: {
    todo?: Todo;
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
    it("renders todo title as a clickable button by default", () => {
      renderTodoItem();

      expect(
        screen.getByRole("button", { name: incompleteTodo.title }),
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

    it("renders description as a clickable button for incomplete todos", () => {
      renderTodoItem({ todo: incompleteTodoWithDescription });

      expect(
        screen.getByRole("button", { name: "Whole milk from the store" }),
      ).toBeInTheDocument();
    });

    it("renders description as a non-clickable span for completed todos", () => {
      renderTodoItem({ todo: completedTodo });

      expect(
        screen.getByText(completedTodo.text as string),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: completedTodo.text as string,
        }),
      ).not.toBeInTheDocument();
    });

    it("does not render description when text is empty", () => {
      renderTodoItem({ todo: incompleteTodo });

      expect(
        screen.queryByText("Whole milk from the store"),
      ).not.toBeInTheDocument();
    });
  });

  describe("entering edit mode", () => {
    it("focuses title input when clicking the title button", async () => {
      const user = userEvent.setup();
      renderTodoItem({ todo: incompleteTodoWithDescription });

      await user.click(
        screen.getByRole("button", {
          name: incompleteTodoWithDescription.title,
        }),
      );

      const titleInput = screen.getByRole("textbox", {
        name: "Edit todo title",
      });
      const textInput = screen.getByRole("textbox", {
        name: "Edit todo description",
      });
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveValue(incompleteTodoWithDescription.title);
      expect(titleInput).toHaveFocus();
      expect(textInput).toHaveValue(incompleteTodoWithDescription.text);
    });

    it("focuses textarea when clicking the description button", async () => {
      const user = userEvent.setup();
      renderTodoItem({ todo: incompleteTodoWithDescription });

      await user.click(
        screen.getByRole("button", {
          name: incompleteTodoWithDescription.text,
        }),
      );

      const textInput = screen.getByRole("textbox", {
        name: "Edit todo description",
      });
      expect(textInput).toHaveFocus();
    });
  });

  describe("cancelling edit with Escape", () => {
    it("restores original title and exits edit mode", async () => {
      const user = userEvent.setup();
      renderTodoItem();

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.title }),
      );
      const input = screen.getByRole("textbox", { name: "Edit todo title" });
      await user.clear(input);
      await user.type(input, "Changed title");
      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("textbox", { name: "Edit todo title" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: incompleteTodo.title }),
      ).toBeInTheDocument();
    });

    it("returns focus to the title button", async () => {
      const user = userEvent.setup();
      renderTodoItem();

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.title }),
      );
      await user.keyboard("{Escape}");

      expect(
        screen.getByRole("button", { name: incompleteTodo.title }),
      ).toHaveFocus();
    });
  });

  describe("saving with Ctrl+Enter in textarea", () => {
    it("calls onUpdate with title and text fields", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.title }),
      );
      const titleInput = screen.getByRole("textbox", {
        name: "Edit todo title",
      });
      const textInput = screen.getByRole("textbox", {
        name: "Edit todo description",
      });
      await user.clear(titleInput);
      await user.type(titleInput, "Updated title");
      await user.click(textInput);
      await user.type(textInput, "Some details");
      await user.keyboard("{Control>}{Enter}{/Control}");

      expect(onUpdate).toHaveBeenCalledWith(incompleteTodo.id, {
        title: "Updated title",
        text: "Some details",
      });
    });
  });

  describe("Enter in textarea", () => {
    it("inserts a newline instead of saving", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.title }),
      );
      const textInput = screen.getByRole("textbox", {
        name: "Edit todo description",
      });
      await user.click(textInput);
      await user.type(textInput, "Line one{Enter}Line two");

      expect(textInput).toHaveValue("Line one\nLine two");
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Enter in title input", () => {
    it("moves focus to textarea instead of saving", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.title }),
      );
      await user.keyboard("{Enter}");

      const textInput = screen.getByRole("textbox", {
        name: "Edit todo description",
      });
      expect(textInput).toHaveFocus();
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe("saving with blur (click-outside)", () => {
    it("calls onUpdate when focus leaves edit wrapper", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.title }),
      );
      const titleInput = screen.getByRole("textbox", {
        name: "Edit todo title",
      });
      await user.clear(titleInput);
      await user.type(titleInput, "Blurred title");

      // Click outside the item to trigger blur-save
      await user.click(document.body);

      expect(onUpdate).toHaveBeenCalledWith(incompleteTodo.id, {
        title: "Blurred title",
      });
    });
  });

  describe("unchanged values", () => {
    it("exits edit mode without API call", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.title }),
      );
      // Press Enter to move to textarea, then Ctrl+Enter to save without changes
      await user.keyboard("{Enter}");
      await user.keyboard("{Control>}{Enter}{/Control}");

      expect(onUpdate).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("textbox", { name: "Edit todo title" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("inline validation", () => {
    describe("on save attempt", () => {
      it("shows error for empty title", async () => {
        const user = userEvent.setup();
        const onUpdate = vi.fn();
        renderTodoItem({ onUpdate });

        await user.click(
          screen.getByRole("button", { name: incompleteTodo.title }),
        );
        const input = screen.getByRole("textbox", {
          name: "Edit todo title",
        });
        await user.clear(input);
        // Move to textarea and Ctrl+Enter to trigger save
        await user.tab();
        await user.keyboard("{Control>}{Enter}{/Control}");

        expect(
          screen.getByText("Title must not be empty."),
        ).toBeInTheDocument();
        expect(input).toBeInTheDocument();
        expect(onUpdate).not.toHaveBeenCalled();
      });

      it("shows error for too-long title", async () => {
        const user = userEvent.setup();
        const onUpdate = vi.fn();
        renderTodoItem({ onUpdate });

        await user.click(
          screen.getByRole("button", { name: incompleteTodo.title }),
        );
        const input = screen.getByRole("textbox", {
          name: "Edit todo title",
        });
        await user.clear(input);
        await user.type(input, "a".repeat(MAX_TODO_TITLE_LENGTH + 1));
        await user.tab();
        await user.keyboard("{Control>}{Enter}{/Control}");

        expect(
          screen.getByText(
            `Title must be between 1 and ${MAX_TODO_TITLE_LENGTH} characters.`,
          ),
        ).toBeInTheDocument();
        expect(input).toBeInTheDocument();
        expect(onUpdate).not.toHaveBeenCalled();
      });
    });
  });

  describe("save failure", () => {
    it("keeps edit mode open with typed values preserved", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(false);
      renderTodoItem({ onUpdate });

      await user.click(
        screen.getByRole("button", { name: incompleteTodo.title }),
      );
      const titleInput = screen.getByRole("textbox", {
        name: "Edit todo title",
      });
      await user.clear(titleInput);
      await user.type(titleInput, "Failed save");
      await user.tab();
      await user.keyboard("{Control>}{Enter}{/Control}");

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });

      expect(
        screen.getByRole("textbox", { name: "Edit todo title" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "Edit todo title" }),
      ).toHaveValue("Failed save");
    });
  });

  describe("completed todo", () => {
    it("renders title as non-clickable span", () => {
      renderTodoItem({ todo: completedTodo });

      expect(
        screen.queryByRole("button", { name: completedTodo.title }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(completedTodo.title)).toBeInTheDocument();
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
        name: `Delete ${incompleteTodo.title}`,
      });
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it("calls onDelete with todo ID", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn().mockResolvedValue(true);
      renderTodoItem({ onDelete });

      await user.click(
        screen.getByRole("button", {
          name: `Delete ${incompleteTodo.title}`,
        }),
      );

      expect(onDelete).toHaveBeenCalledWith(incompleteTodo.id);
    });
  });
});
