import { Tag } from "@/components/Tag/Tag";
import type { BookingStatus } from "@sitter/domain/booking";
import { STATUS_LABELS } from "../../utils/booking-labels/booking-labels";

const VARIANTS = {
  requested: "warning",
  confirmed: "verified",
  declined: "neutral",
  cancelled: "neutral",
  expired: "neutral",
} as const satisfies Record<BookingStatus, "neutral" | "verified" | "warning">;

/** A booking's status as a small coloured label. */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Tag variant={VARIANTS[status]}>{STATUS_LABELS[status]}</Tag>;
}
