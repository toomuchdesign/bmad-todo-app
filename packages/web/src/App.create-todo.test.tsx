/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Todo } from "shared";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { TODO_FIXTURES } from "./test-utils";

describe("App", () => {
  describe("create todo flow", () => {
    describe("on successful create", () => {
      it("adds the new todo to the list", async () => {
        const newTodo: Todo = {
          id: "3",
          title: "New task",
          text: "",
          completed: false,
          createdAt: "2026-03-03T10:00:00.000Z",
          updatedAt: "2026-03-03T10:00:00.000Z",
        };

        fetchMock
          .get("/todos", { todos: TODO_FIXTURES })
          .post("/todos", newTodo);

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        const input = screen.getByRole("textbox", { name: "New todo title" });
        fireEvent.change(input, { target: { value: "New task" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        await waitFor(() => {
          expect(screen.getByText("New task")).toBeInTheDocument();
        });
        expect(input).toHaveValue("");
      });
    });

    describe("on failed create", () => {
      it("shows global error banner and preserves input", async () => {
        fetchMock.get("/todos", { todos: TODO_FIXTURES }).post("/todos", {
          status: 500,
          body: { code: "INTERNAL_ERROR", message: "Database error" },
        });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        const input = screen.getByRole("textbox", { name: "New todo title" });
        fireEvent.change(input, { target: { value: "New task" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        await waitFor(() => {
          expect(screen.getByText("Database error")).toBeInTheDocument();
        });
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(input).toHaveValue("New task");
      });
    });

    it("shows inline validation for empty input without network call", async () => {
      fetchMock.get("/todos", { todos: TODO_FIXTURES });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(screen.getByText("Title must not be empty.")).toBeInTheDocument();
      expect(fetchMock).toHaveFetchedTimes(1);
    });

    it("shows inline validation for too-long input without network call", async () => {
      fetchMock.get("/todos", { todos: TODO_FIXTURES });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox", { name: "New todo title" });
      fireEvent.change(input, { target: { value: "a".repeat(101) } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(
        screen.getByText("Title must be between 1 and 100 characters."),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveFetchedTimes(1);
    });
  });
});
