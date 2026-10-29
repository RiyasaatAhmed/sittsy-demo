import { Router, type Response } from "express";
import type { ErrorResponse, PriceSuggestionResponse } from "@sitter/domain/contract";
import { suggestPrice } from "@sitter/domain/pricing";
import { parseLocation } from "@sitter/domain/search";
import { sendInvalidQuery } from "../../shared/http/error-responses";
import type { SittersRepository } from "./sitters.repository";
import { searchParamsOf } from "../../shared/http/search-params-of";

/** GET /api/price-suggestion?lat=48.86&lng=2.35&service=dog_walking */
export function priceSuggestionRouter({ sitters }: { sitters: SittersRepository }): Router {
  const router = Router();
  router.get("/price-suggestion", async (req, res: Response<PriceSuggestionResponse | ErrorResponse>) => {
    const parsed = parseLocation(searchParamsOf(req));
    if (!parsed.ok) {
      sendInvalidQuery(res, parsed.errors);
      return;
    }
    const { service, lat, lng } = parsed.value;
    const offering = await sitters.findOffering(service);
    res.json({ suggestion: suggestPrice(service, lat, lng, offering) });
  });
  return router;
}
