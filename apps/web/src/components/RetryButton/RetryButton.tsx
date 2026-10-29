import { Button } from "../Button/Button";
import { RefreshIcon } from "../icons/icons";

type Props = {
  onRetry: () => void;
  /** True while the retry runs: disabled, and says so. */
  retrying?: boolean;
  variant?: "primary" | "secondary";
};

/** The one "Try again" button used by every error and offline state. */
export function RetryButton({ onRetry, retrying = false, variant = "primary" }: Props) {
  return (
    <Button variant={variant} onClick={onRetry} disabled={retrying}>
      <RefreshIcon />
      {retrying ? "Trying again…" : "Try again"}
    </Button>
  );
}
