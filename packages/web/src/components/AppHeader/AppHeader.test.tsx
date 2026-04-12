/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from ".";

describe("AppHeader", () => {
  describe("authView is 'login'", () => {
    it("renders Log in and Register nav buttons", () => {
      render(
        <AppHeader authView="login" onNavigate={vi.fn()} onLogout={vi.fn()} />,
      );

      expect(
        screen.getByRole("button", { name: "Log in" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Register" }),
      ).toBeInTheDocument();
    });

    it("marks Log in as active with aria-current", () => {
      render(
        <AppHeader authView="login" onNavigate={vi.fn()} onLogout={vi.fn()} />,
      );

      expect(screen.getByRole("button", { name: "Log in" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        screen.getByRole("button", { name: "Register" }),
      ).not.toHaveAttribute("aria-current");
    });

    describe("Register click", () => {
      it("calls onNavigate('register')", async () => {
        const user = userEvent.setup();
        const onNavigate = vi.fn();

        render(
          <AppHeader
            authView="login"
            onNavigate={onNavigate}
            onLogout={vi.fn()}
          />,
        );

        await user.click(screen.getByRole("button", { name: "Register" }));

        expect(onNavigate).toHaveBeenCalledWith("register");
      });
    });
  });

  describe("authView is 'register'", () => {
    it("marks Register as active with aria-current", () => {
      render(
        <AppHeader
          authView="register"
          onNavigate={vi.fn()}
          onLogout={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: "Register" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        screen.getByRole("button", { name: "Log in" }),
      ).not.toHaveAttribute("aria-current");
    });

    describe("Log in click", () => {
      it("calls onNavigate('login')", async () => {
        const user = userEvent.setup();
        const onNavigate = vi.fn();

        render(
          <AppHeader
            authView="register"
            onNavigate={onNavigate}
            onLogout={vi.fn()}
          />,
        );

        await user.click(screen.getByRole("button", { name: "Log in" }));

        expect(onNavigate).toHaveBeenCalledWith("login");
      });
    });
  });

  describe("authView is 'app'", () => {
    it("renders the Log out button", () => {
      render(
        <AppHeader authView="app" onNavigate={vi.fn()} onLogout={vi.fn()} />,
      );

      expect(
        screen.getByRole("button", { name: "Log out" }),
      ).toBeInTheDocument();
    });

    it("does not render nav links", () => {
      render(
        <AppHeader authView="app" onNavigate={vi.fn()} onLogout={vi.fn()} />,
      );

      expect(
        screen.queryByRole("button", { name: "Log in" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Register" }),
      ).not.toBeInTheDocument();
    });

    describe("Log out click", () => {
      it("calls onLogout", async () => {
        const user = userEvent.setup();
        const onLogout = vi.fn();

        render(
          <AppHeader authView="app" onNavigate={vi.fn()} onLogout={onLogout} />,
        );

        await user.click(screen.getByRole("button", { name: "Log out" }));

        expect(onLogout).toHaveBeenCalledOnce();
      });
    });
  });
});
