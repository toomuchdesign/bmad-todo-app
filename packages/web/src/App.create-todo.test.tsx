/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Todo } from "shared";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import {
  getAddTodoButton,
  getNewTodoTitleInput,
  TODO_FIXTURES,
} from "./test-utils";

const TEST_USER_ID = "test-user-id";

beforeEach(() => {
  localStorage.setItem("auth_token", "test-token");
  fetchMock.post("/api/auth/logout", 204);
});

describe("App", () => {
  describe("create todo flow", () => {
    describe("on successful create", () => {
      it("adds the new todo to the list", async () => {
        const newTodo: Todo = {
          id: "3",
          title: "New task",
          text: "",
          completed: false,
          userId: TEST_USER_ID,
          createdAt: "2026-03-03T10:00:00.000Z",
          updatedAt: "2026-03-03T10:00:00.000Z",
        };

        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .post("/api/todos", newTodo);

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        const input = getNewTodoTitleInput();
        fireEvent.change(input, { target: { value: "New task" } });
        fireEvent.click(getAddTodoButton());

        await waitFor(() => {
          expect(screen.getByText("New task")).toBeInTheDocument();
        });
        expect(input).toHaveValue("");
        expect(fetchMock).toHavePosted("/api/todos", {
          headers: { authorization: "Bearer test-token" },
        });
      });
    });

    describe("on failed create", () => {
      it("shows global error banner and preserves input", async () => {
        fetchMock
          .get("/api/todos", { todos: TODO_FIXTURES })
          .post("/api/todos", {
            status: 500,
            body: { code: "INTERNAL_ERROR", message: "Database error" },
          });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        const input = getNewTodoTitleInput();
        fireEvent.change(input, { target: { value: "New task" } });
        fireEvent.click(getAddTodoButton());

        await waitFor(() => {
          expect(screen.getByText("Database error")).toBeInTheDocument();
        });
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(input).toHaveValue("New task");
      });
    });

    it("shows inline validation for empty input without network call", async () => {
      fetchMock.get("/api/todos", { todos: TODO_FIXTURES });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      fireEvent.click(getAddTodoButton());

      expect(screen.getByText("Title must not be empty.")).toBeInTheDocument();
      expect(fetchMock).toHaveFetchedTimes(1);
    });

    it("shows inline validation for too-long input without network call", async () => {
      fetchMock.get("/api/todos", { todos: TODO_FIXTURES });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      const input = getNewTodoTitleInput();
      fireEvent.change(input, { target: { value: "a".repeat(101) } });
      fireEvent.click(getAddTodoButton());

      expect(
        screen.getByText("Title must be between 1 and 100 characters."),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveFetchedTimes(1);
    });
  });
});
