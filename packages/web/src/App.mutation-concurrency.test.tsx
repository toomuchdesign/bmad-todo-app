/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_USER_ID, type Todo } from "shared";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { createDeferred, TODO_FIXTURES } from "./test-utils";

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: "1",
    title: "Buy milk",
    text: "",
    completed: false,
    userId: DEFAULT_USER_ID,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("App", () => {
  describe("mutation concurrency", () => {
    it("mutations on different todos succeed independently", async () => {
      const user = userEvent.setup();
      const firstDeferred = createDeferred<void>();
      const secondDeferred = createDeferred<void>();

      const toggledFirst = makeTodo({
        id: "1",
        completed: true,
        updatedAt: "2026-04-01T10:00:00.000Z",
      });

      const toggledSecond = makeTodo({
        id: "2",
        title: "Walk the dog",
        text: "Take the usual route through the park",
        completed: false,
        createdAt: "2026-03-02T12:00:00.000Z",
        updatedAt: "2026-04-01T10:00:00.000Z",
      });

      let patchCallCount = 0;
      fetchMock.get("/todos", { todos: TODO_FIXTURES });
      fetchMock.patch("express:/todos/:id", () => {
        patchCallCount++;
        if (patchCallCount === 1) {
          return firstDeferred.promise.then(() => toggledFirst);
        }
        return secondDeferred.promise.then(() => toggledSecond);
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });

      // Toggle first todo (incomplete → completed)
      await user.click(screen.getByRole("checkbox", { name: /Buy milk/ }));

      // Toggle second todo (completed → incomplete) while first is in flight
      await user.click(screen.getByRole("checkbox", { name: /Walk the dog/ }));

      // Both requests should be in flight concurrently
      expect(patchCallCount).toBe(2);

      // Resolve both
      firstDeferred.resolve();
      secondDeferred.resolve();

      await waitFor(() => {
        expect(
          screen.getByRole("checkbox", { name: /Buy milk/ }),
        ).toBeChecked();
        expect(
          screen.getByRole("checkbox", { name: /Walk the dog/ }),
        ).not.toBeChecked();
      });

      // No error banner
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(fetchMock).toHavePatched("express:/todos/:id", {
        headers: { "x-user-id": DEFAULT_USER_ID },
      });
    });

    describe("given rapid toggle while first is in-flight", () => {
      it("aborts first, applies second, shows no error", async () => {
        const user = userEvent.setup();
        const firstDeferred = createDeferred<void>();
        const secondDeferred = createDeferred<void>();

        const toggledOn = makeTodo({
          completed: true,
          updatedAt: "2026-04-01T10:00:00.000Z",
        });
        const toggledOff = makeTodo({
          completed: false,
          updatedAt: "2026-04-01T11:00:00.000Z",
        });

        let patchCallCount = 0;
        fetchMock.get("/todos", { todos: TODO_FIXTURES });
        fetchMock.patch("express:/todos/:id", () => {
          patchCallCount++;
          if (patchCallCount === 1) {
            return firstDeferred.promise.then(() => toggledOn);
          }
          return secondDeferred.promise.then(() => toggledOff);
        });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        // First toggle: incomplete → completed (stays in-flight)
        await user.click(screen.getByRole("checkbox", { name: /Buy milk/ }));
        expect(patchCallCount).toBe(1);

        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Buy milk/ }),
          ).toBeChecked();
        });

        // Second toggle while first is still in-flight: completed → incomplete
        await user.click(screen.getByRole("checkbox", { name: /Buy milk/ }));
        expect(patchCallCount).toBe(2);

        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Buy milk/ }),
          ).not.toBeChecked();
        });

        // Resolve first (aborted — should be ignored)
        firstDeferred.resolve();
        // Resolve second (the winner)
        secondDeferred.resolve();

        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Buy milk/ }),
          ).not.toBeChecked();
        });

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("rapid toggle same checkbox", () => {
      it("second toggle after first resolves works correctly", async () => {
        const user = userEvent.setup();
        let patchCallCount = 0;

        const toggledOn = makeTodo({
          completed: true,
          updatedAt: "2026-04-01T10:00:00.000Z",
        });
        const toggledOff = makeTodo({
          completed: false,
          updatedAt: "2026-04-01T11:00:00.000Z",
        });

        fetchMock.get("/todos", { todos: TODO_FIXTURES });
        fetchMock.patch("express:/todos/:id", () => {
          patchCallCount++;
          if (patchCallCount === 1) return toggledOn;
          return toggledOff;
        });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        // First toggle: incomplete → completed
        await user.click(screen.getByRole("checkbox", { name: /Buy milk/ }));
        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Buy milk/ }),
          ).toBeChecked();
        });

        // Second toggle: completed → incomplete
        await user.click(screen.getByRole("checkbox", { name: /Buy milk/ }));
        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Buy milk/ }),
          ).not.toBeChecked();
        });

        expect(patchCallCount).toBe(2);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("edit title then toggle same todo", () => {
      it("both changes applied after sequential resolution", async () => {
        const user = userEvent.setup();
        let patchCallCount = 0;

        const editedTodo = makeTodo({
          title: "Buy oat milk",
          updatedAt: "2026-04-01T10:00:00.000Z",
        });
        const toggledTodo = makeTodo({
          title: "Buy oat milk",
          completed: true,
          updatedAt: "2026-04-01T11:00:00.000Z",
        });

        fetchMock.get("/todos", { todos: TODO_FIXTURES });
        fetchMock.patch("express:/todos/:id", () => {
          patchCallCount++;
          if (patchCallCount === 1) return editedTodo;
          return toggledTodo;
        });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        // Edit title
        await user.click(screen.getByRole("button", { name: "Buy milk" }));
        const titleInput = screen.getByRole("textbox", {
          name: "Edit todo title",
        });
        await user.clear(titleInput);
        await user.type(titleInput, "Buy oat milk");
        await user.tab();
        await user.keyboard("{Control>}{Enter}{/Control}");

        await waitFor(() => {
          expect(screen.getByText("Buy oat milk")).toBeInTheDocument();
        });

        // Toggle completion after edit resolves
        await user.click(
          screen.getByRole("checkbox", { name: /Buy oat milk/ }),
        );

        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Buy oat milk/ }),
          ).toBeChecked();
        });

        expect(patchCallCount).toBe(2);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("out-of-order resolution of concurrent different-item mutations", () => {
      it("does not show error", async () => {
        const user = userEvent.setup();
        const firstDeferred = createDeferred<void>();
        const secondDeferred = createDeferred<void>();

        const toggledFirst = makeTodo({
          id: "1",
          completed: true,
          updatedAt: "2026-04-01T10:00:00.000Z",
        });

        const toggledSecond = makeTodo({
          id: "2",
          title: "Walk the dog",
          text: "Take the usual route through the park",
          completed: false,
          createdAt: "2026-03-02T12:00:00.000Z",
          updatedAt: "2026-04-01T10:00:00.000Z",
        });

        let patchCallCount = 0;
        fetchMock.get("/todos", { todos: TODO_FIXTURES });
        fetchMock.patch("express:/todos/:id", () => {
          patchCallCount++;
          if (patchCallCount === 1) {
            return firstDeferred.promise.then(() => toggledFirst);
          }
          return secondDeferred.promise.then(() => toggledSecond);
        });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText("Buy milk")).toBeInTheDocument();
        });

        // Toggle first todo
        await user.click(screen.getByRole("checkbox", { name: /Buy milk/ }));

        // Toggle second todo while first is in flight
        await user.click(
          screen.getByRole("checkbox", { name: /Walk the dog/ }),
        );

        expect(patchCallCount).toBe(2);

        // Resolve SECOND request first (out of order)
        secondDeferred.resolve();

        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Walk the dog/ }),
          ).not.toBeChecked();
        });

        // Then resolve first request
        firstDeferred.resolve();

        await waitFor(() => {
          expect(
            screen.getByRole("checkbox", { name: /Buy milk/ }),
          ).toBeChecked();
        });

        // No error from out-of-order resolution
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });
});
