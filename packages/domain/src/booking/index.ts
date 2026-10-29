// Public API of the booking module: other packages import only from here.

export { parseBookingRequest, parseBookingTarget, parseSitterDecision } from "./booking-request";
export type { BookingRequest, BookingTarget, SitterDecision } from "./booking-request";
export { quoteStay } from "./quote";
export type { Quote, QuoteLine } from "./quote";
export {
  BOOKABLE_SERVICES,
  BOOKING_TIME_ZONE,
  MAX_DAYS_AHEAD,
  MAX_STAY_NIGHTS,
  REQUEST_TTL_HOURS,
  bookingToday,
  isBookableService,
} from "./rules";
export type { BookableService } from "./rules";
export { BOOKING_STATUSES, CAPACITY_STATUSES, canTransition, holdsCapacity, requestExpiresAt, statusAt } from "./status";
export type { BookingStatus } from "./status";
export { nightsIn, parseStay } from "./stay";
export type { Stay } from "./stay";
