/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { createDeferred, TODO_FIXTURES } from "./test-utils";

describe("App", () => {
  describe("delete todo flow", () => {
    it("shows pending state and row remains visible while delete is in flight", async () => {
      const user = userEvent.setup();
      const deferred = createDeferred<void>();

      fetchMock
        .get("/todos", { todos: TODO_FIXTURES })
        .delete("express:/todos/:id", () => deferred.promise.then(() => 204));

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

    it("removes the todo from the list on successful delete", async () => {
      const user = userEvent.setup();

      fetchMock
        .get("/todos", { todos: TODO_FIXTURES })
        .delete("express:/todos/:id", 204);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Delete Buy milk" }));

      await waitFor(() => {
        expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
      });

      // Other todo is still present
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    });

    it("keeps the todo visible and shows error banner on API failure", async () => {
      const user = userEvent.setup();
      const deferred = createDeferred<void>();

      fetchMock
        .get("/todos", { todos: TODO_FIXTURES })
        .delete("express:/todos/:id", () =>
          deferred.promise.then(() => ({
            status: 500,
            body: { code: "INTERNAL_ERROR", message: "Server error" },
          })),
        );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Delete Buy milk" }));

      // Non-optimistic: todo is still visible
      expect(screen.getByText("Buy milk")).toBeInTheDocument();

      deferred.resolve();

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText("Server error")).toBeInTheDocument();
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    it("keeps the todo visible and shows error banner on network error", async () => {
      const user = userEvent.setup();
      const deferred = createDeferred<void>();

      fetchMock
        .get("/todos", { todos: TODO_FIXTURES })
        .delete("express:/todos/:id", () =>
          deferred.promise.then(() => {
            throw new TypeError("Failed to fetch");
          }),
        );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Delete Buy milk" }));

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
