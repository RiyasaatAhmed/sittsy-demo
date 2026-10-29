import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/utils/cx/cx";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
};

/** The app's button: dark primary, outlined secondary, or a quiet text action. Never submits a form by accident. */
export function Button({ variant = "primary", className, type = "button", ...props }: Props) {
  return <button type={type} className={cx(styles.button, styles[variant], className)} {...props} />;
}
