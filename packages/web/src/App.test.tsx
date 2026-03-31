/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import {
  createDeferred,
  fetchMock,
  mockGetTodos,
  mockGetTodosError,
  mockGetTodosNetworkError,
  TODO_FIXTURES,
} from "./test-utils";

describe("App", () => {
  describe("page structure", () => {
    it("renders the Todos heading", () => {
      fetchMock.mockGlobal().get("/todos", new Promise(() => {}));

      render(<App />);

      expect(
        screen.getByRole("heading", { name: "Todos" }),
      ).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows a loading indicator while fetching todos", () => {
      fetchMock.mockGlobal().get("/todos", new Promise(() => {}));

      render(<App />);

      expect(screen.getByText("Loading…")).toBeInTheDocument();
      expect(screen.queryByText("No todos yet.")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no todos exist", async () => {
      mockGetTodos([]);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("No todos yet.")).toBeInTheDocument();
      });
      expect(screen.getByText("Add your first one above.")).toBeInTheDocument();
    });
  });

  describe("list state", () => {
    it("renders todo items when todos are loaded", async () => {
      mockGetTodos(TODO_FIXTURES);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    });

    it("shows completion status for each todo", async () => {
      mockGetTodos(TODO_FIXTURES);

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
      mockGetTodosError({
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
      mockGetTodosNetworkError();

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
      mockGetTodosError();

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Couldn't load todos. Check your connection and try again.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows a Retry button that is disabled during fetch and resolves on success", async () => {
      mockGetTodosNetworkError();

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Retry" }),
        ).toBeInTheDocument();
      });

      const deferred = createDeferred<{ todos: typeof TODO_FIXTURES }>();
      fetchMock.removeRoutes().get("/todos", () => deferred.promise);

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
      });

      deferred.resolve({ todos: TODO_FIXTURES });

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
