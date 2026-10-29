import type { SittersResponse } from "@sitter/domain/contract";
import { toSitterSearchParams, type SitterSearch } from "@sitter/domain/search";
import { getJson } from "@/lib/http-client/http-client";

// One function per API endpoint the UI calls.

export function fetchSitters(search: SitterSearch, signal?: AbortSignal): Promise<SittersResponse> {
  return getJson(`/api/sitters?${toSitterSearchParams(search)}`, signal);
}
