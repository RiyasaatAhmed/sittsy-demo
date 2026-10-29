import { RetryButton } from "../RetryButton/RetryButton";
import styles from "./ErrorBanner.module.css";

type Props = {
  title: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

/** A problem shown above content that is still on screen, announced to screen readers. */
export function ErrorBanner({ title, message, onRetry, retrying }: Props) {
  return (
    <div className={styles.banner} role="alert">
      <div>
        <p className={styles.title}>{title}</p>
        {message && <p className={styles.message}>{message}</p>}
      </div>
      {onRetry && <RetryButton onRetry={onRetry} retrying={retrying} variant="secondary" />}
    </div>
  );
}
