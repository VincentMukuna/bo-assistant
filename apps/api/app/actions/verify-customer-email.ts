import CustomerEmailVerification from "#models/customer_email_verification";
import { hashCustomerEmailVerificationCode } from "#actions/request-customer-email-verification";
import { safeEqual } from "@poppinss/utils";
import { DateTime } from "luxon";

const MAX_FAILED_ATTEMPTS = 5;

export default async function verifyCustomerEmail(verificationId: string, code: string) {
  const verification = await CustomerEmailVerification.query()
    .where("id", verificationId)
    .preload("customer")
    .first();

  if (!verification || verification.expiresAt <= DateTime.now()) {
    if (verification) await verification.delete();
    return { status: "expired" } as const;
  }

  const submittedHash = hashCustomerEmailVerificationCode(verification.id, code);
  if (!safeEqual(verification.codeHash, submittedHash)) {
    verification.failedAttempts += 1;
    if (verification.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await verification.delete();
      return { status: "locked" } as const;
    }

    await verification.save();
    return { status: "invalid" } as const;
  }

  const customer = verification.customer;
  customer.email = verification.email;
  customer.name = verification.name || customer.name;
  customer.emailVerifiedAt = DateTime.now();
  await customer.save();
  await CustomerEmailVerification.query().where("customerId", customer.id).delete();

  return { status: "verified", customer } as const;
}
