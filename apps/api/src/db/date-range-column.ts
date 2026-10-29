// Postgres `daterange` as a Drizzle column, mapped to a Stay ({ checkIn,
// checkOut }). Postgres stores date ranges as [lower, upper) (end exclusive),
// which is exactly how a stay is defined (see @sitter/domain/booking).

import { customType } from "drizzle-orm/pg-core";
import type { Stay } from "@sitter/domain/booking";

const RANGE = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/;

export function parseDateRange(text: string): Stay {
  const match = RANGE.exec(text);
  if (!match?.[1] || !match[2]) throw new Error(`Unexpected daterange value: ${text}`);
  return { checkIn: match[1], checkOut: match[2] };
}

export function formatDateRange({ checkIn, checkOut }: Stay): string {
  return `[${checkIn},${checkOut})`;
}

export const dateRange = customType<{ data: Stay; driverData: string }>({
  dataType: () => "daterange",
  toDriver: formatDateRange,
  fromDriver: parseDateRange,
});
