import { useEffect, useRef, useState } from "react";

import type { AuthResult, RegisterCredentials } from "../../hooks/useAuth";
import styles from "./RegisterForm.module.css";

const MIN_PASSWORD_LENGTH = 8;

type RegisterFormProps = {
  onRegister: (credentials: RegisterCredentials) => Promise<AuthResult>;
  onNavigateLogin: () => void;
};

/** Register form with name/email/password fields, inline error display, and footer navigation. */
function RegisterForm({ onRegister, onNavigateLogin }: RegisterFormProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Auto-focus first field on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(undefined);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string).trim();
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setLoading(true);
    const result = await onRegister({ name, email, password });
    setLoading(false);

    if (!result.ok) {
      if (result.status === 409) {
        setError("An account with this email already exists");
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

  const inputClassName = error
    ? `${styles.input} ${styles.inputError}`
    : styles.input;

  return (
    <form onSubmit={handleSubmit} className={styles.form} aria-label="Register">
      <div className={styles.field}>
        <label htmlFor="register-name">Name</label>
        <input
          ref={nameRef}
          id="register-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className={inputClassName}
          onChange={handleInputChange}
          placeholder="Your name"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClassName}
          onChange={handleInputChange}
          placeholder="you@example.com"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={inputClassName}
          onChange={handleInputChange}
          placeholder="Min. 8 characters"
        />
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? "Creating account\u2026" : "Create account"}
      </button>
      <p className={styles.footer}>
        Already have an account?{" "}
        <button
          type="button"
          className={styles.footerLink}
          onClick={onNavigateLogin}
        >
          Log in
        </button>
      </p>
    </form>
  );
}

export { RegisterForm };
