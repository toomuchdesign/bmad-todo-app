import { useEffect, useRef, useState } from "react";

import type { AuthResult, LoginCredentials } from "../../hooks/useAuth";
import { Button, Input } from "../atoms";
import { FormField } from "../FormField";
import styles from "./LoginForm.module.css";

type LoginFormProps = {
  onLogin: (credentials: LoginCredentials) => Promise<AuthResult>;
  onNavigateRegister: () => void;
};

/** Login form with email/password fields, inline error display, and footer navigation. */
function LoginForm({ onLogin, onNavigateRegister }: LoginFormProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Auto-focus first field on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(undefined);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    if (!email || !password) {
      return;
    }

    setLoading(true);
    const result = await onLogin({ email, password });
    setLoading(false);

    if (!result.ok) {
      if (result.status === 401) {
        setError("Incorrect email or password");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  function handleInputChange(): void {
    if (error) {
      setError(undefined);
    }
  }

  const hasError = !!error;

  return (
    <form onSubmit={handleSubmit} className={styles.form} aria-label="Log in">
      <FormField id="login-email" label="Email">
        <Input
          ref={emailRef}
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          error={hasError}
          onChange={handleInputChange}
          placeholder="you@example.com"
        />
      </FormField>
      <FormField id="login-password" label="Password">
        <Input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          error={hasError}
          onChange={handleInputChange}
        />
      </FormField>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button
        variant="primary"
        type="submit"
        loading={loading}
        loadingText={"Logging in\u2026"}
      >
        Log in
      </Button>
      <p className={styles.footer}>
        Don&apos;t have an account?{" "}
        <button
          type="button"
          className={styles.footerLink}
          onClick={onNavigateRegister}
        >
          Register
        </button>
      </p>
    </form>
  );
}

export { LoginForm };
