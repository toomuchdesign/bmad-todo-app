import styles from "./GlobalErrorBanner.module.css";

type GlobalErrorBannerProps = {
  message: string;
  onRetry?: () => void;
};

/** Displays a global error banner with an optional retry action. */
function GlobalErrorBanner({ message, onRetry }: GlobalErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export { GlobalErrorBanner };
