/// <reference types="@testing-library/jest-dom/vitest" />
import type { Todo } from "@bmad-todo/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const TODO_FIXTURES: Todo[] = [
  {
    id: "1",
    text: "Buy milk",
    completed: false,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
  },
  {
    id: "2",
    text: "Walk the dog",
    completed: true,
    createdAt: "2026-03-02T12:00:00.000Z",
    updatedAt: "2026-03-02T14:00:00.000Z",
  },
];

function mockFetchSuccess(todos: Todo[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ todos }),
    }),
  );
}

function mockFetchError(body?: { code: string; message: string }): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: body
        ? () => Promise.resolve(body)
        : () => Promise.reject(new Error("no body")),
    }),
  );
}

function mockFetchNetworkError(): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  describe("loading state", () => {
    it("shows a loading indicator while fetching todos", () => {
      vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

      render(<App />);

      expect(screen.getByText("Loading…")).toBeInTheDocument();
      expect(screen.queryByText("No todos yet.")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no todos exist", async () => {
      mockFetchSuccess([]);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("No todos yet.")).toBeInTheDocument();
      });
      expect(screen.getByText("Add your first one above.")).toBeInTheDocument();
    });
  });

  describe("list state", () => {
    it("renders todo items when todos are loaded", async () => {
      mockFetchSuccess(TODO_FIXTURES);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    });

    it("shows completion status for each todo", async () => {
      mockFetchSuccess(TODO_FIXTURES);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });
  });

  describe("error state", () => {
    it("shows error banner with API error message on server error", async () => {
      mockFetchError({
        code: "INTERNAL_ERROR",
        message: "Database connection failed",
      });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText("Database connection failed"),
        ).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("shows generic error message on network failure", async () => {
      mockFetchNetworkError();

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Couldn't load todos. Check your connection and try again.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows generic error message when error body cannot be parsed", async () => {
      mockFetchError();

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Couldn't load todos. Check your connection and try again.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows a Retry button that triggers a new fetch", async () => {
      mockFetchNetworkError();

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Retry" }),
        ).toBeInTheDocument();
      });

      mockFetchSuccess(TODO_FIXTURES);

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("page structure", () => {
    it("renders the Todos heading", () => {
      vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

      render(<App />);

      expect(
        screen.getByRole("heading", { name: "Todos" }),
      ).toBeInTheDocument();
    });
  });
});
