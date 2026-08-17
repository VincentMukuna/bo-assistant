import type Customer from "#models/customer";
import BookingSummaryTransformer from "#transformers/booking_summary_transformer";
import CustomerTransformer from "#transformers/customer_transformer";

export default class CustomerDetailsTransformer extends CustomerTransformer {
  constructor(resource: Customer) {
    super(resource);
  }

  toObject() {
    return {
      ...super.toObject(),
      bookings: BookingSummaryTransformer.transform(this.resource.bookings),
    };
  }
}
