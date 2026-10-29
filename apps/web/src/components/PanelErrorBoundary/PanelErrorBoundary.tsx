"use client";

import { catchError, type ErrorInfo } from "next/error";
import { ErrorState } from "../ErrorState/ErrorState";

type FallbackProps = {
  /** What failed, e.g. "The map could not be shown". */
  title: string;
};

function PanelErrorFallback({ title }: FallbackProps, { error, retry }: ErrorInfo) {
  // Development-only detail; production keeps the message generic.
  const detail =
    process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
  return <ErrorState title={title} message={detail} onRetry={retry} />;
}

/**
 * Error boundary for one panel of the page (Next.js `catchError`). A crash in
 * the wrapped panel shows a fallback with "Try again" instead of taking down
 * the whole page; the rest of the page keeps working.
 */
export const PanelErrorBoundary = catchError(PanelErrorFallback);
