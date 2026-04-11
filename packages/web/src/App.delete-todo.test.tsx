/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { createDeferred, TODO_FIXTURES } from "./test-utils";

beforeEach(() => {
  localStorage.setItem("auth_token", "test-token");
  fetchMock.post("/api/auth/logout", 204);
});

describe("App", () => {
  describe("delete todo flow", () => {
    it("shows pending state and row remains visible while delete is in flight", async () => {
      const user = userEvent.setup();
      const deferred = createDeferred<void>();

      fetchMock
        .get("/api/todos", { todos: TODO_FIXTURES })
        .delete("express:/api/todos/:id", () =>
          deferred.promise.then(() => 204),
        );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Delete Buy milk" }));

      // Non-optimistic: todo is still visible while request is in flight
      expect(screen.getByText("Buy milk")).toBeInTheDocument();

      // Resolve to complete the test
      deferred.resolve();

      await waitFor(() => {
        expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
      });
    });

    describe("on successful delete", () => {
      it("removes the todo from the list", async () => {
        const user = userEvent.setup();

        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .delete("express:/api/todos/:id", 204);

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(
          screen.getByRole("button", { name: "Delete Buy milk" }),
        );

        await waitFor(() => {
          expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
        });

        // Other todo is still present
        expect(screen.getByText("Walk the dog")).toBeInTheDocument();
      });

      it("moves focus to the next todo's checkbox after delete", async () => {
        const user = userEvent.setup();

        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .delete("express:/api/todos/:id", 204);

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(
          screen.getByRole("button", { name: "Delete Buy milk" }),
        );

        await waitFor(() => {
          expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
        });

        // Focus moves to the remaining todo's checkbox
        expect(screen.getByRole("checkbox")).toHaveFocus();
      });

      it("moves focus to the add input when list becomes empty", async () => {
        const user = userEvent.setup();
        const singleTodo = [TODO_FIXTURES[0]];

        fetchMock
          .get("/api/todos", { todos: singleTodo })
          .delete("express:/api/todos/:id", 204);

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(
          screen.getByRole("button", { name: "Delete Buy milk" }),
        );

        await waitFor(() => {
          expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
        });

        // Focus returns to the add title input
        expect(
          screen.getByRole("textbox", { name: "New todo title" }),
        ).toHaveFocus();
      });
    });

    describe("on 404 response", () => {
      it("removes the todo from the list without showing error banner", async () => {
        const user = userEvent.setup();

        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .delete("express:/api/todos/:id", {
            status: 404,
            body: { code: "NOT_FOUND", message: "Todo not found" },
          });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(
          screen.getByRole("button", { name: "Delete Buy milk" }),
        );

        await waitFor(() => {
          expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
        });

        // No error banner shown
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        // Other todo still present
        expect(screen.getByText("Walk the dog")).toBeInTheDocument();
      });
    });

    describe("on API failure", () => {
      it("keeps the todo visible and shows error banner", async () => {
        const user = userEvent.setup();
        const deferred = createDeferred<void>();

        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .delete("express:/api/todos/:id", () =>
            deferred.promise.then(() => ({
              status: 500,
              body: { code: "INTERNAL_ERROR", message: "Server error" },
            })),
          );

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(
          screen.getByRole("button", { name: "Delete Buy milk" }),
        );

        // Non-optimistic: todo is still visible
        expect(screen.getByText("Buy milk")).toBeInTheDocument();

        deferred.resolve();

        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
        });
        expect(screen.getByText("Server error")).toBeInTheDocument();
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
    });

    describe("on network error", () => {
      it("keeps the todo visible and shows error banner", async () => {
        const user = userEvent.setup();
        const deferred = createDeferred<void>();

        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .delete("express:/api/todos/:id", () =>
            deferred.promise.then(() => {
              throw new TypeError("Failed to fetch");
            }),
          );

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        await user.click(
          screen.getByRole("button", { name: "Delete Buy milk" }),
        );

        // Non-optimistic: todo is still visible
        expect(screen.getByText("Buy milk")).toBeInTheDocument();

        deferred.resolve();

        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
        });
        expect(
          screen.getByText("Couldn't save changes. Please try again."),
        ).toBeInTheDocument();
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
    });
  });
});
