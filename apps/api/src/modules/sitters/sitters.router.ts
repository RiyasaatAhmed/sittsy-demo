import { Router, type Response } from "express";
import { bookingToday } from "@sitter/domain/booking";
import type { ErrorResponse, SittersResponse } from "@sitter/domain/contract";
import { parseSitterSearch } from "@sitter/domain/search";
import { sendInvalidQuery } from "../../shared/http/error-responses";
import { rankedPage } from "./ranked-page";
import type { SittersRepository } from "./sitters.repository";
import { searchParamsOf } from "../../shared/http/search-params-of";

type Deps = { sitters: SittersRepository; now: () => Date };

/**
 * GET /api/sitters?lat=48.86&lng=2.35&service=dog_walking&limit=20&page=1
 * Optional: w_quality, w_responsiveness, w_activity, w_distance, w_cold_start (0–1), boost=true|false,
 * from=YYYY-MM-DD&to=YYYY-MM-DD (only sitters free on those dates; `to` is exclusive, from = to is one day).
 * `limit` is the page size and `page` (1-based) picks which slice of the ranking to return.
 */
export function sittersRouter({ sitters, now }: Deps): Router {
  const router = Router();
  router.get("/sitters", async (req, res: Response<SittersResponse | ErrorResponse>) => {
    const at = now();
    const parsed = parseSitterSearch(searchParamsOf(req), bookingToday(at));
    if (!parsed.ok) {
      sendInvalidQuery(res, parsed.errors);
      return;
    }
    const search = parsed.value;
    const candidates = await sitters.findOffering(search.service);
    const unavailable = search.stay
      ? await sitters.findUnavailable(search.stay, at, candidates.map((sitter) => sitter.id))
      : new Set<number>();
    res.json(rankedPage(candidates, search, at, unavailable));
  });
  return router;
}
