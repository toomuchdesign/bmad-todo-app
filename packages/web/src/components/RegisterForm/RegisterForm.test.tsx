/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AuthResult } from "../../hooks/useAuth";

import { RegisterForm } from ".";

describe("RegisterForm", () => {
  describe("rendering", () => {
    it("shows name, email, and password fields with a submit button", () => {
      render(
        <RegisterForm
          onRegister={vi.fn().mockResolvedValue({ ok: true })}
          onNavigateLogin={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create account" }),
      ).toBeInTheDocument();
    });
  });

  describe("successful submit", () => {
    it("calls onRegister with the entered credentials", async () => {
      const user = userEvent.setup();
      const onRegister = vi.fn().mockResolvedValue({ ok: true });

      render(
        <RegisterForm onRegister={onRegister} onNavigateLogin={vi.fn()} />,
      );

      await user.type(screen.getByLabelText("Name"), "Test User");
      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Create account" }));

      await waitFor(() => {
        expect(onRegister).toHaveBeenCalledWith({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      let resolve: (value: AuthResult) => void = () => {};
      const onRegister = vi.fn().mockReturnValue(
        new Promise<AuthResult>((r) => {
          resolve = r;
        }),
      );

      render(
        <RegisterForm onRegister={onRegister} onNavigateLogin={vi.fn()} />,
      );

      await user.type(screen.getByLabelText("Name"), "Test User");
      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Create account" }));

      // Button should be disabled and show loading text while request is pending
      const loadingButton = screen.getByRole("button", {
        name: "Creating account\u2026",
      });
      expect(loadingButton).toBeDisabled();

      resolve({ ok: true });
    });
  });

  describe("409 response", () => {
    it("shows 'An account with this email already exists' inline error", async () => {
      const user = userEvent.setup();
      const onRegister = vi.fn().mockResolvedValue({ ok: false, status: 409 });

      render(
        <RegisterForm onRegister={onRegister} onNavigateLogin={vi.fn()} />,
      );

      await user.type(screen.getByLabelText("Name"), "Test User");
      await user.type(screen.getByLabelText("Email"), "taken@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Create account" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "An account with this email already exists",
        );
      });
    });
  });

  describe("navigation link click", () => {
    it("calls onNavigateLogin", async () => {
      const user = userEvent.setup();
      const onNavigateLogin = vi.fn();

      render(
        <RegisterForm
          onRegister={vi.fn().mockResolvedValue({ ok: true })}
          onNavigateLogin={onNavigateLogin}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Log in" }));

      expect(onNavigateLogin).toHaveBeenCalledOnce();
    });
  });
});
