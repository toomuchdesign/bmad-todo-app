/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Todo } from "shared";
import { describe, expect, it } from "vitest";
import App from "./App";
import { fetchMock, TODO_FIXTURES } from "./test-utils";

describe("App", () => {
  describe("edit todo flow", () => {
    it("updates todo text in the list after editing and pressing Enter", async () => {
      const user = userEvent.setup();
      const updatedTodo: Todo = {
        id: "1",
        text: "Buy oat milk",
        completed: false,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-30T10:00:00.000Z",
      };
      fetchMock
        .mockGlobal()
        .get("/todos", { todos: TODO_FIXTURES })
        .patch("express:/todos/:id", updatedTodo);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Buy milk" }));
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Buy oat milk{Enter}");

      await waitFor(() => {
        expect(screen.getByText("Buy oat milk")).toBeInTheDocument();
      });
      expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("textbox", { name: "Edit todo text" }),
      ).not.toBeInTheDocument();
    });

    it("restores original text when pressing Escape", async () => {
      const user = userEvent.setup();
      fetchMock.mockGlobal().get("/todos", { todos: TODO_FIXTURES });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Buy milk" }));
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Something else");
      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("textbox", { name: "Edit todo text" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Buy milk" }),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveFetchedTimes(1);
    });

    it("shows global error banner on save failure and preserves edit mode", async () => {
      const user = userEvent.setup();
      fetchMock
        .mockGlobal()
        .get("/todos", { todos: TODO_FIXTURES })
        .patch("express:/todos/:id", {
          status: 500,
          body: { code: "INTERNAL_ERROR", message: "Database error" },
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Buy milk" }));
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Failed edit{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText("Database error")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "Edit todo text" }),
      ).toHaveValue("Failed edit");
    });
  });
});
