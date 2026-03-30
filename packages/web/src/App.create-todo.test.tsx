/// <reference types="@testing-library/jest-dom/vitest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Todo } from "shared";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { mockFetchSuccess, TODO_FIXTURES } from "./test-utils";

describe("App", () => {
  describe("create todo flow", () => {
    it("adds a new todo to the list on successful create", async () => {
      const newTodo: Todo = {
        id: "3",
        text: "New task",
        completed: false,
        createdAt: "2026-03-03T10:00:00.000Z",
        updatedAt: "2026-03-03T10:00:00.000Z",
      };

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ todos: TODO_FIXTURES }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newTodo),
        });
      vi.stubGlobal("fetch", mockFetch);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox", { name: "New todo text" });
      fireEvent.change(input, { target: { value: "New task" } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(screen.getByText("New task")).toBeInTheDocument();
      });
      expect(input).toHaveValue("");
    });

    it("shows global error banner on failed create and preserves input", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ todos: TODO_FIXTURES }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              code: "INTERNAL_ERROR",
              message: "Database error",
            }),
        });
      vi.stubGlobal("fetch", mockFetch);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox", { name: "New todo text" });
      fireEvent.change(input, { target: { value: "New task" } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() => {
        expect(screen.getByText("Database error")).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(input).toHaveValue("New task");
      expect(
        screen.queryByText("New task", { selector: "span" }),
      ).not.toBeInTheDocument();
    });

    it("shows inline validation for empty input without network call", async () => {
      mockFetchSuccess(TODO_FIXTURES);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(
        screen.getByText("Todo text must not be empty."),
      ).toBeInTheDocument();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("shows inline validation for too-long input without network call", async () => {
      mockFetchSuccess(TODO_FIXTURES);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox", { name: "New todo text" });
      fireEvent.change(input, { target: { value: "a".repeat(201) } });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(
        screen.getByText("Todo text must be between 1 and 200 characters."),
      ).toBeInTheDocument();
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
