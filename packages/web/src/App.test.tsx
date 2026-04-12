/// <reference types="@testing-library/jest-dom/vitest" />
import fetchMock from "@fetch-mock/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import {
  createDeferred,
  getAddTodoButton,
  getNewTodoTitleInput,
  TODO_FIXTURES,
} from "./test-utils";

beforeEach(() => {
  localStorage.setItem("auth_token", "test-token");
  fetchMock.post("/api/auth/logout", 204);
});

describe("App", () => {
  describe("page structure", () => {
    it("renders the Todos heading", () => {
      fetchMock.get("/api/todos", new Promise(() => {}));

      render(<App />);

      expect(
        screen.getByRole("heading", { name: "Todos" }),
      ).toBeInTheDocument();
    });

    it("wraps content in a main landmark", () => {
      fetchMock.get("/api/todos", new Promise(() => {}));

      render(<App />);

      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows a loading indicator while fetching todos", () => {
      fetchMock.get("/api/todos", new Promise(() => {}));

      render(<App />);

      expect(screen.getByText("Loading…")).toBeInTheDocument();
      expect(screen.queryByText("No todos yet.")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no todos exist", async () => {
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("No todos yet.")).toBeInTheDocument();
      });
      expect(screen.getByText("Add your first one above.")).toBeInTheDocument();
    });
  });

  describe("list state", () => {
    it("renders todo items when todos are loaded", async () => {
      fetchMock.get("/api/todos", { todos: TODO_FIXTURES });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    });

    it("shows completion status for each todo", async () => {
      fetchMock.get("/api/todos", { todos: TODO_FIXTURES });

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
    describe("on server error", () => {
      it("shows error banner with API error message", async () => {
        fetchMock.get("/api/todos", {
          status: 500,
          body: {
            code: "INTERNAL_ERROR",
            message: "Database connection failed",
          },
        });

        render(<App />);

        await waitFor(() => {
          expect(
            screen.getByText("Database connection failed"),
          ).toBeInTheDocument();
        });
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    describe("on network failure", () => {
      it("shows generic error message", async () => {
        fetchMock.get("/api/todos", { throws: new Error("Network error") });

        render(<App />);

        await waitFor(() => {
          expect(
            screen.getByText(
              "Couldn't load todos. Check your connection and try again.",
            ),
          ).toBeInTheDocument();
        });
      });
    });

    describe("when error body cannot be parsed", () => {
      it("shows generic error message", async () => {
        fetchMock.get("/api/todos", { throws: new Error("no body") });

        render(<App />);

        await waitFor(() => {
          expect(
            screen.getByText(
              "Couldn't load todos. Check your connection and try again.",
            ),
          ).toBeInTheDocument();
        });
      });
    });

    it("clears stale todo list when retry-fetch fails after initial success", async () => {
      // Arrange — initial load succeeds, then a create fails to trigger error banner
      fetchMock.get("/api/todos", { todos: TODO_FIXTURES });
      fetchMock.post("/api/todos", {
        status: 500,
        body: { code: "INTERNAL_ERROR", message: "Create failed" },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      // Trigger error banner via failed create
      const titleInput = getNewTodoTitleInput();
      fireEvent.change(titleInput, { target: { value: "New todo" } });
      fireEvent.click(getAddTodoButton());

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Act — retry fetch fails
      fetchMock
        .removeRoutes()
        .get("/api/todos", { throws: new Error("Network error") });

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      // Assert — stale list cleared, only error banner shown
      await waitFor(() => {
        expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
      });
      expect(screen.queryByText("Walk the dog")).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("shows a Retry button that is disabled during fetch and resolves on success", async () => {
      fetchMock.get("/api/todos", { throws: new Error("Network error") });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Retry" }),
        ).toBeInTheDocument();
      });

      const deferred = createDeferred<{ todos: typeof TODO_FIXTURES }>();
      fetchMock.removeRoutes().get("/api/todos", () => deferred.promise);

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
