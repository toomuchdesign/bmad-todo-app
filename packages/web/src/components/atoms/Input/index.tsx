import { clsx } from "clsx";
import { forwardRef } from "react";

import styles from "./Input.module.css";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

/**
 * Reusable text input atom with optional error state.
 * Forwards its ref to the underlying <input> element.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error = false, className, ...rest },
  ref,
) {
  const composedClassName = clsx(
    styles.input,
    error && styles.error,
    className,
  );

  return <input ref={ref} className={composedClassName} {...rest} />;
});

export type { InputProps };
export { Input };
