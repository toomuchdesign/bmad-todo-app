import { Button } from "./atoms";
import styles from "./GlobalErrorBanner.module.css";

type GlobalErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  loading?: boolean;
};

/** Displays a global error banner with an optional retry action. */
function GlobalErrorBanner({
  message,
  onRetry,
  loading = false,
}: GlobalErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry} disabled={loading}>
          Retry
        </Button>
      )}
    </div>
  );
}

export { GlobalErrorBanner };
