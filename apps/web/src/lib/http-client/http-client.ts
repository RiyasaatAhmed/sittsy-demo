import type { ErrorResponse } from "@sitter/domain/contract";
import { ApiError } from "../api-error/api-error";

/** The error body (`{ error, details, … }`), or undefined when it is not JSON. */
async function errorBody(response: Response): Promise<ErrorResponse | undefined> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return undefined;
  }
}

/** Sends a request; throws ApiError on a non-2xx status, so TanStack Query sees it as an error. */
async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await errorBody(response);
    // One readable line, e.g. "Invalid query parameters — lat must be …".
    const message = body ? [body.error, ...(body.details ?? [])].join(" — ") : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, body);
  }
  return (await response.json()) as T;
}

/** GET a JSON endpoint. */
export function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return requestJson(url, { signal });
}

/** POST JSON (or nothing) to an endpoint, with optional extra headers. */
export function postJson<T>(url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  return requestJson(url, {
    method: "POST",
    headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
