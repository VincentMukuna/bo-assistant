import type Booking from "#models/booking";
import BookingSummaryTransformer from "#transformers/booking_summary_transformer";
import CustomerTransformer from "#transformers/customer_transformer";

export default class BookingTransformer extends BookingSummaryTransformer {
  constructor(resource: Booking) {
    super(resource);
  }

  toObject() {
    return {
      ...super.toObject(),
      customer: CustomerTransformer.transform(this.resource.customer),
    };
  }
}
