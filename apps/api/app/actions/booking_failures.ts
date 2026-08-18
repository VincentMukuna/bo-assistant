import { TaggedError } from "better-result";

export class BookingCustomerNotFound extends TaggedError("BookingCustomerNotFound")<{
  customerId: number;
  message: string;
}> {}

export class BookingStoreUnavailable extends TaggedError("BookingStoreUnavailable")<{
  operation:
    | "create"
    | "update"
    | "delete"
    | "load-customer"
    | "load-booking"
    | "load-reschedule-grant"
    | "load-staff-bookings"
    | "save-booking"
    | "transaction";
  bookingId?: number;
  cause: unknown;
  message: string;
}> {}
