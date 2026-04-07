/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Todo } from "shared";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { createDeferred, TODO_FIXTURES } from "./test-utils";

describe("App", () => {
  describe("toggle todo flow", () => {
    it("marks an incomplete todo as completed after clicking the checkbox", async () => {
      const user = userEvent.setup();
      const toggledTodo: Todo = {
        id: "1",
        title: "Buy milk",
        text: "",
        completed: true,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-30T10:00:00.000Z",
      };
      fetchMock
        .get("/todos", { todos: TODO_FIXTURES })
        .patch("express:/todos/:id", toggledTodo);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      const checkbox = screen.getByRole("checkbox", {
        name: /Buy milk/,
      });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);

      // Optimistic: checkbox is immediately checked
      await waitFor(() => {
        expect(
          screen.getByRole("checkbox", { name: /Buy milk/ }),
        ).toBeChecked();
      });

      // Verify PATCH was called correctly
      expect(fetchMock).toHavePatched("express:/todos/:id", {
        body: { completed: true },
      });
    });

    describe("when toggle API fails", () => {
      it("reverts checkbox and shows error banner", async () => {
        const user = userEvent.setup();
        const deferred = createDeferred<void>();

        fetchMock
          .get("/todos", { todos: TODO_FIXTURES })
          .patch("express:/todos/:id", () =>
            deferred.promise.then(() => ({
              status: 500,
              body: { code: "INTERNAL_ERROR", message: "Database error" },
            })),
          );

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        const checkbox = screen.getByRole("checkbox", {
          name: /Buy milk/,
        });
        expect(checkbox).not.toBeChecked();

        await user.click(checkbox);

        // Optimistic: checkbox is immediately checked before API responds
        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Buy milk/ }),
          ).toBeChecked();
        });

        // Let the PATCH failure resolve
        deferred.resolve();

        // After failure: checkbox reverts to unchecked and error banner appears
        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
        });
        expect(screen.getByText("Database error")).toBeInTheDocument();
        expect(
          screen.getByRole("checkbox", { name: /Buy milk/ }),
        ).not.toBeChecked();
      });
    });
  });
});
