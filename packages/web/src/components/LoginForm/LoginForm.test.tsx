/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AuthResult } from "../../hooks/useAuth";
import { createDeferred } from "../../test-utils";
import { LoginForm } from ".";

describe("LoginForm", () => {
  describe("rendering", () => {
    it("shows email and password fields with a submit button", () => {
      render(
        <LoginForm
          onLogin={vi.fn().mockResolvedValue({ ok: true })}
          onNavigateRegister={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Log in" }),
      ).toBeInTheDocument();
    });

    it("shows the register navigation link", () => {
      render(
        <LoginForm
          onLogin={vi.fn().mockResolvedValue({ ok: true })}
          onNavigateRegister={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Register" }),
      ).toBeInTheDocument();
    });
  });

  describe("successful submit", () => {
    it("calls onLogin with the entered credentials", async () => {
      const user = userEvent.setup();
      const onLogin = vi.fn().mockResolvedValue({ ok: true });

      render(<LoginForm onLogin={onLogin} onNavigateRegister={vi.fn()} />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      await waitFor(() => {
        expect(onLogin).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      const deferred = createDeferred<AuthResult>();
      const onLogin = vi.fn().mockReturnValue(deferred.promise);

      render(<LoginForm onLogin={onLogin} onNavigateRegister={vi.fn()} />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      // Button should show loading text and be disabled during submission
      expect(
        screen.getByRole("button", { name: /logging in/i }),
      ).toBeDisabled();

      deferred.resolve({ ok: true });
    });
  });

  describe("401 response", () => {
    it("shows 'Incorrect email or password' inline error", async () => {
      const user = userEvent.setup();
      const onLogin = vi.fn().mockResolvedValue({ ok: false, status: 401 });

      render(<LoginForm onLogin={onLogin} onNavigateRegister={vi.fn()} />);

      await user.type(screen.getByLabelText("Email"), "wrong@example.com");
      await user.type(screen.getByLabelText("Password"), "wrongpass");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Incorrect email or password",
        );
      });
    });
  });

  describe("navigation link click", () => {
    it("calls onNavigateRegister", async () => {
      const user = userEvent.setup();
      const onNavigateRegister = vi.fn();

      render(
        <LoginForm
          onLogin={vi.fn().mockResolvedValue({ ok: true })}
          onNavigateRegister={onNavigateRegister}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Register" }));

      expect(onNavigateRegister).toHaveBeenCalledOnce();
    });
  });
});
