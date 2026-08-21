import CustomerEmailVerification from "#models/customer_email_verification";
import { hashCustomerEmailVerificationToken } from "#actions/request-customer-email-verification";
import { DateTime } from "luxon";

export default async function verifyCustomerEmail(token: string) {
  const verification = await CustomerEmailVerification.query()
    .where("tokenHash", hashCustomerEmailVerificationToken(token))
    .preload("customer")
    .first();

  if (!verification || verification.expiresAt <= DateTime.now()) {
    if (verification) await verification.delete();
    return null;
  }

  const customer = verification.customer;
  customer.email = verification.email;
  customer.name = verification.name || customer.name;
  customer.emailVerifiedAt = DateTime.now();
  await customer.save();
  await CustomerEmailVerification.query().where("customerId", customer.id).delete();

  return customer;
}
