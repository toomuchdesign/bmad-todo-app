import styles from "./FormField.module.css";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: React.ReactElement;
};

/**
 * Molecule wrapping a label + input + optional error message.
 * The `children` slot is the input element itself (already configured
 * with its own `id` that matches `htmlFor`).
 */
function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export type { FormFieldProps };
export { FormField };
