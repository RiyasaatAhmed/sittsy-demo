// The price of a stay, computed by the server. Money is in integer cents so
// totals never pick up floating-point errors.

import { nightsIn, type Stay } from "./stay";

export type QuoteLine = {
  label: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
};

export type Quote = {
  currency: "EUR";
  nights: number;
  lines: QuoteLine[];
  totalCents: number;
};

/** Itemised quote: nights × the sitter's nightly rate. No fees or taxes in the demo. */
export function quoteStay(nightlyRateEur: number, stay: Stay): Quote {
  const nights = nightsIn(stay);
  const unitAmountCents = Math.round(nightlyRateEur * 100);
  const line: QuoteLine = {
    label: `${nights} ${nights === 1 ? "night" : "nights"} × €${nightlyRateEur}`,
    quantity: nights,
    unitAmountCents,
    amountCents: nights * unitAmountCents,
  };
  return { currency: "EUR", nights, lines: [line], totalCents: line.amountCents };
}
