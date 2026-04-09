/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_USER_ID, type Todo } from "shared";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { TODO_FIXTURES } from "./test-utils";

describe("App", () => {
  describe("edit todo flow", () => {
    it("updates todo title in the list after editing and saving with Ctrl+Enter", async () => {
      const user = userEvent.setup();
      const updatedTodo: Todo = {
        id: "1",
        title: "Buy oat milk",
        text: "",
        completed: false,
        userId: DEFAULT_USER_ID,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-30T10:00:00.000Z",
      };
      fetchMock
        .get("/api/todos", { todos: TODO_FIXTURES })
        .patch("express:/api/todos/:id", updatedTodo);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Buy milk" }));
      const titleInput = screen.getByRole("textbox", {
        name: "Edit todo title",
      });
      await user.clear(titleInput);
      await user.type(titleInput, "Buy oat milk");
      // Move to textarea and save with Ctrl+Enter
      await user.tab();
      await user.keyboard("{Control>}{Enter}{/Control}");

      await waitFor(() => {
        expect(screen.getByText("Buy oat milk")).toBeInTheDocument();
      });
      expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("textbox", { name: "Edit todo title" }),
      ).not.toBeInTheDocument();
      expect(fetchMock).toHavePatched("express:/api/todos/:id", {
        headers: { "x-user-id": DEFAULT_USER_ID },
      });
    });

    describe("when pressing Escape", () => {
      it("restores original title", async () => {
        const user = userEvent.setup();
        fetchMock.get("/api/todos", { todos: TODO_FIXTURES });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Buy milk" }));
        const input = screen.getByRole("textbox", {
          name: "Edit todo title",
        });
        await user.clear(input);
        await user.type(input, "Something else");
        await user.keyboard("{Escape}");

        expect(
          screen.queryByRole("textbox", { name: "Edit todo title" }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Buy milk" }),
        ).toBeInTheDocument();
        expect(fetchMock).toHaveFetchedTimes(1);
      });
    });

    describe("on 404 response", () => {
      it("removes the todo from the list without showing error banner", async () => {
        const user = userEvent.setup();
        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .patch("express:/api/todos/:id", {
            status: 404,
            body: { code: "NOT_FOUND", message: "Todo not found" },
          });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Buy milk" }));
        const titleInput = screen.getByRole("textbox", {
          name: "Edit todo title",
        });
        await user.clear(titleInput);
        await user.type(titleInput, "Buy oat milk");
        await user.tab();
        await user.keyboard("{Control>}{Enter}{/Control}");

        await waitFor(() => {
          expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
        });
        expect(screen.queryByText("Buy oat milk")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        // Other todo still present
        expect(screen.getByText("Walk the dog")).toBeInTheDocument();
      });
    });

    describe("on save failure", () => {
      it("shows global error banner and preserves edit mode", async () => {
        const user = userEvent.setup();
        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .patch("express:/api/todos/:id", {
            status: 500,
            body: { code: "INTERNAL_ERROR", message: "Database error" },
          });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Buy milk" }));
        const titleInput = screen.getByRole("textbox", {
          name: "Edit todo title",
        });
        await user.clear(titleInput);
        await user.type(titleInput, "Failed edit");
        await user.tab();
        await user.keyboard("{Control>}{Enter}{/Control}");

        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
        });
        expect(screen.getByText("Database error")).toBeInTheDocument();
        expect(
          screen.getByRole("textbox", { name: "Edit todo title" }),
        ).toHaveValue("Failed edit");
      });
    });
  });
});
