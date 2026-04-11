/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("App auth gate", () => {
  describe("when no auth token in localStorage", () => {
    it("shows the Create user button", () => {
      render(<App />);

      expect(
        screen.getByRole("button", { name: "Create user & start" }),
      ).toBeInTheDocument();
    });

    it("does not render the todo list", () => {
      render(<App />);

      expect(
        screen.queryByRole("textbox", { name: "New todo title" }),
      ).not.toBeInTheDocument();
    });

    it("renders the todo list and stores the token after clicking Create user & start", async () => {
      const user = userEvent.setup();
      fetchMock.post("/api/auth/register", {
        status: 201,
        body: { user: { id: "new-user-id" }, token: "fresh-token" },
      });
      fetchMock.post("/api/auth/logout", 204);
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      await user.click(
        screen.getByRole("button", { name: "Create user & start" }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("textbox", { name: "New todo title" }),
        ).toBeInTheDocument();
      });

      // Token stored in localStorage after successful registration
      expect(localStorage.getItem("auth_token")).toBe("fresh-token");
    });
  });

  describe("when auth token is present in localStorage", () => {
    beforeEach(() => {
      localStorage.setItem("auth_token", "test-token");
      fetchMock.post("/api/auth/logout", 204);
    });

    it("renders the todo list", async () => {
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("textbox", { name: "New todo title" }),
        ).toBeInTheDocument();
      });
    });

    it("shows the Log out button", async () => {
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Log out" }),
        ).toBeInTheDocument();
      });
    });

    it("does not show the Create user button", () => {
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      expect(
        screen.queryByRole("button", { name: "Create user & start" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("on logout button click", () => {
    beforeEach(() => {
      localStorage.setItem("auth_token", "test-token");
      fetchMock.post("/api/auth/logout", 204);
    });

    it("shows the Create user button after clicking Log out", async () => {
      const user = userEvent.setup();
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Log out" }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Log out" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Create user & start" }),
        ).toBeInTheDocument();
      });

      // Token cleared from localStorage
      expect(localStorage.getItem("auth_token")).toBeNull();
    });
  });

  describe("on 401 from todo API", () => {
    beforeEach(() => {
      localStorage.setItem("auth_token", "expired-token");
      fetchMock.post("/api/auth/logout", 204);
    });

    it("clears the token and shows the Create user button", async () => {
      fetchMock.get("/api/todos", {
        status: 401,
        body: { code: "UNAUTHORIZED", message: "Authentication required" },
      });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Create user & start" }),
        ).toBeInTheDocument();
      });

      expect(localStorage.getItem("auth_token")).toBeNull();
    });
  });
});
