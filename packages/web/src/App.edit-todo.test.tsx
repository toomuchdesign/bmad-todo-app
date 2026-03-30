/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Todo } from "shared";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { TODO_FIXTURES } from "./test-utils";

function mockFetchForEdit(patchResponse: {
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
  describe("edit todo flow", () => {
    it("updates todo text in the list after editing and pressing Enter", async () => {
      const user = userEvent.setup();
      const updatedTodo: Todo = {
        id: "1",
        text: "Buy oat milk",
        completed: false,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-30T10:00:00.000Z",
      };
      const mockFetch = mockFetchForEdit({ ok: true, body: updatedTodo });
      vi.stubGlobal("fetch", mockFetch);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Buy milk" }));
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Buy oat milk{Enter}");

      await waitFor(() => {
        expect(screen.getByText("Buy oat milk")).toBeInTheDocument();
      });
      expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("textbox", { name: "Edit todo text" }),
      ).not.toBeInTheDocument();
    });

    it("restores original text when pressing Escape", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ todos: TODO_FIXTURES }),
      });
      vi.stubGlobal("fetch", mockFetch);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Buy milk" }));
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Something else");
      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("textbox", { name: "Edit todo text" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Buy milk" }),
      ).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("shows global error banner on save failure and preserves edit mode", async () => {
      const user = userEvent.setup();
      const mockFetch = mockFetchForEdit({
        ok: false,
        status: 500,
        body: { code: "INTERNAL_ERROR", message: "Database error" },
      });
      vi.stubGlobal("fetch", mockFetch);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Buy milk" }));
      const input = screen.getByRole("textbox", { name: "Edit todo text" });
      await user.clear(input);
      await user.type(input, "Failed edit{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText("Database error")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "Edit todo text" }),
      ).toHaveValue("Failed edit");
    });
  });
});
