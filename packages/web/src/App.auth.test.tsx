/// <reference types="@testing-library/jest-dom/vitest" />

import fetchMock from "@fetch-mock/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import {
  getAuthNavButton,
  getEmailInput,
  getLoginSubmitButton,
  getLogoutButton,
  getNameInput,
  getNewTodoTitleInput,
  getPasswordInput,
  queryNameInput,
  queryNewTodoTitleInput,
  queryPasswordInput,
} from "./test-utils";

describe("App auth routing", () => {
  describe("no auth token in localStorage", () => {
    it("shows the login form", () => {
      render(<App />);

      expect(getEmailInput()).toBeInTheDocument();
      expect(getPasswordInput()).toBeInTheDocument();
      // AC4: login screen shown specifically, not register or todo list
      expect(queryNameInput()).not.toBeInTheDocument();
    });

    it("does not render the todo list", () => {
      render(<App />);

      expect(queryNewTodoTitleInput()).not.toBeInTheDocument();
    });

    describe("Register nav button click", () => {
      it("shows the register form", async () => {
        const user = userEvent.setup();

        render(<App />);

        await user.click(getAuthNavButton({ name: "Register" }));

        await waitFor(() => {
          expect(getNameInput()).toBeInTheDocument();
        });
        expect(
          screen.getByRole("button", { name: "Create account" }),
        ).toBeInTheDocument();
      });
    });

    describe("Log in nav button click from register", () => {
      it("shows the login form", async () => {
        const user = userEvent.setup();

        render(<App />);

        // Navigate to register first
        await user.click(getAuthNavButton({ name: "Register" }));

        await waitFor(() => {
          expect(getNameInput()).toBeInTheDocument();
        });

        // Navigate back to login via header nav
        await user.click(getAuthNavButton({ name: "Log in" }));

        await waitFor(() => {
          expect(queryNameInput()).not.toBeInTheDocument();
        });
        expect(getEmailInput()).toBeInTheDocument();
      });
    });

    describe("successful login submit", () => {
      it("shows the todo list and stores the auth token", async () => {
        const user = userEvent.setup();
        fetchMock.post("/api/auth/login", {
          status: 200,
          body: { user: { id: "user-1" }, token: "fresh-token" },
        });
        fetchMock.post("/api/auth/logout", 204);
        fetchMock.get("/api/todos", { todos: [] });

        render(<App />);

        await user.type(getEmailInput(), "test@example.com");
        await user.type(getPasswordInput(), "password123");
        await user.click(getLoginSubmitButton());

        await waitFor(() => {
          expect(getNewTodoTitleInput()).toBeInTheDocument();
        });

        expect(localStorage.getItem("auth_token")).toBe("fresh-token");
      });
    });

    describe("login submit with 401 response", () => {
      it("shows inline error and does not show todo list", async () => {
        const user = userEvent.setup();
        fetchMock.post("/api/auth/login", {
          status: 401,
          body: { code: "UNAUTHORIZED", message: "Invalid credentials" },
        });

        render(<App />);

        await user.type(getEmailInput(), "wrong@example.com");
        await user.type(getPasswordInput(), "wrongpass");
        await user.click(getLoginSubmitButton());

        await waitFor(() => {
          expect(screen.getByRole("alert")).toHaveTextContent(
            "Incorrect email or password",
          );
        });

        expect(queryNewTodoTitleInput()).not.toBeInTheDocument();
      });
    });
  });

  describe("auth token is present in localStorage", () => {
    beforeEach(() => {
      localStorage.setItem("auth_token", "test-token");
      fetchMock.post("/api/auth/logout", 204);
    });

    it("renders the todo list", async () => {
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      await waitFor(() => {
        expect(getNewTodoTitleInput()).toBeInTheDocument();
      });
    });

    it("does not show the login form", () => {
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      expect(queryPasswordInput()).not.toBeInTheDocument();
    });

    it("shows the Log out button in the header", async () => {
      fetchMock.get("/api/todos", { todos: [] });

      render(<App />);

      await waitFor(() => {
        expect(getLogoutButton()).toBeInTheDocument();
      });
    });

    describe("logout", () => {
      it("shows the login form and clears the auth token", async () => {
        const user = userEvent.setup();
        fetchMock.get("/api/todos", { todos: [] });

        render(<App />);

        await waitFor(() => {
          expect(getLogoutButton()).toBeInTheDocument();
        });

        await user.click(getLogoutButton());

        await waitFor(() => {
          expect(getEmailInput()).toBeInTheDocument();
        });

        expect(localStorage.getItem("auth_token")).toBeNull();
      });
    });

    describe("401 from todo API", () => {
      it("clears the auth token and shows the login form", async () => {
        fetchMock.get("/api/todos", {
          status: 401,
          body: { code: "UNAUTHORIZED", message: "Authentication required" },
        });

        render(<App />);

        await waitFor(() => {
          // Login form visible after auth token cleared
          expect(getEmailInput()).toBeInTheDocument();
        });

        expect(localStorage.getItem("auth_token")).toBeNull();
      });
    });
  });
});
