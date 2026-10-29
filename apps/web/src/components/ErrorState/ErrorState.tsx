import { AlertCircleIcon } from "../icons/icons";
import { RetryButton } from "../RetryButton/RetryButton";
import styles from "./ErrorState.module.css";

type Props = {
  title: string;
  message?: string;
  /** Shown as "Try again". Leave out when retrying cannot help (e.g. invalid input). */
  onRetry?: () => void;
  retrying?: boolean;
};

/**
 * Takes the place of content that could not be loaded or shown, and is
 * announced to screen readers. For a problem next to content that is still
 * shown, use ErrorBanner instead.
 */
export function ErrorState({ title, message, onRetry, retrying }: Props) {
  return (
    <div className={styles.state} role="alert">
      <span className={styles.iconBox} aria-hidden="true">
        <AlertCircleIcon />
      </span>
      <p className={styles.title}>{title}</p>
      {message && <p className={styles.message}>{message}</p>}
      {onRetry && <RetryButton onRetry={onRetry} retrying={retrying} />}
    </div>
  );
}
