/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  mockFetchError,
  mockFetchNetworkError,
  mockFetchSuccess,
  TODO_FIXTURES,
} from "./test-utils";

describe("App", () => {
  describe("page structure", () => {
    it("renders the Todos heading", () => {
      vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

      render(<App />);

      expect(
        screen.getByRole("heading", { name: "Todos" }),
      ).toBeInTheDocument();
    });
  });

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

    it("shows a Retry button that is disabled during fetch and resolves on success", async () => {
      mockFetchNetworkError();

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Retry" }),
        ).toBeInTheDocument();
      });

      let resolveFetch!: (value: unknown) => void;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockReturnValue(
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
        ),
      );

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
      });

      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ todos: TODO_FIXTURES }),
      });

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
