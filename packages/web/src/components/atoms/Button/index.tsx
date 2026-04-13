import { clsx } from "clsx";

import styles from "./Button.module.css";

type ButtonVariant = "primary" | "ghost";

type ButtonProps = {
  variant: ButtonVariant;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  onClick?: () => void;
  children: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Reusable button atom with primary/ghost variants.
 * Supports a loading state that renders `loadingText` (or children suffixed
 * with an ellipsis) and disables the button.
 */
function Button({
  variant,
  type = "button",
  disabled = false,
  loading = false,
  loadingText,
  onClick,
  children,
  className,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const composedClassName = clsx(
    styles.button,
    variant === "primary" ? styles.primary : styles.ghost,
    className,
  );

  const isDisabled = disabled || loading;
  const content = loading ? (loadingText ?? `${children}\u2026`) : children;

  return (
    <button
      type={type}
      className={composedClassName}
      disabled={isDisabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}

export type { ButtonProps, ButtonVariant };
export { Button };
