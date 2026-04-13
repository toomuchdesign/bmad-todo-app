import { clsx } from "clsx";
import { forwardRef } from "react";

import styles from "./Checkbox.module.css";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Reusable checkbox atom.
 * Forwards its ref to the underlying <input type="checkbox"> element.
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...rest },
  ref,
) {
  const composedClassName = clsx(styles.checkbox, className);

  return (
    <input ref={ref} type="checkbox" className={composedClassName} {...rest} />
  );
});

export type { CheckboxProps };
export { Checkbox };
