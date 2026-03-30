/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Todo } from "shared";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { createDeferred, TODO_FIXTURES } from "./test-utils";

function mockFetchForToggle(patchResponse: {
  ok: boolean;
  status?: number;
  body: unknown;
}) {
  return vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ todos: TODO_FIXTURES }),
    })
    .mockResolvedValueOnce({
      ok: patchResponse.ok,
      status: patchResponse.status ?? (patchResponse.ok ? 200 : 500),
      json: () => Promise.resolve(patchResponse.body),
    });
}

describe("App", () => {
  describe("toggle todo flow", () => {
    it("marks an incomplete todo as completed after clicking the checkbox", async () => {
      const user = userEvent.setup();
      const toggledTodo: Todo = {
        id: "1",
        text: "Buy milk",
        completed: true,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-30T10:00:00.000Z",
      };
      const mockFetch = mockFetchForToggle({ ok: true, body: toggledTodo });
      vi.stubGlobal("fetch", mockFetch);

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
      expect(mockFetch).toHaveBeenCalledWith("/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
    });

    it("reverts checkbox and shows error banner when toggle API fails", async () => {
      const user = userEvent.setup();
      const deferred = createDeferred<void>();

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ todos: TODO_FIXTURES }),
        })
        .mockImplementationOnce(() =>
          deferred.promise.then(() => ({
            ok: false,
            status: 500,
            json: () =>
              Promise.resolve({
                code: "INTERNAL_ERROR",
                message: "Database error",
              }),
          })),
        );
      vi.stubGlobal("fetch", mockFetch);

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
