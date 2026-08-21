import CustomerEmailVerification from "#models/customer_email_verification";
import Customer from "#models/customer";
import SupportConversation from "#models/support_conversation";
import { hashCustomerEmailVerificationCode } from "#actions/request-customer-email-verification";
import db from "@adonisjs/lucid/services/db";
import { safeEqual } from "@poppinss/utils";
import { DateTime } from "luxon";

const MAX_FAILED_ATTEMPTS = 5;

export default async function verifyCustomerEmail(email: string, code: string) {
  const verification = await CustomerEmailVerification.query()
    .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
    .orderBy("createdAt", "desc")
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

  const customer = await db.transaction(async (trx) => {
    const existing = await Customer.query({ client: trx })
      .whereRaw("LOWER(email) = ?", [verification.email.toLowerCase()])
      .first();
    const target =
      existing ??
      (verification.customerId
        ? await Customer.find(verification.customerId, { client: trx })
        : null) ??
      (await Customer.create(
        {
          name: verification.name || "",
          email: verification.email,
          phone: "",
          address: "",
          notes: "",
        },
        { client: trx }
      ));

    target.email = verification.email;
    target.name = verification.name || target.name;
    target.emailVerifiedAt = DateTime.now();
    await target.save();

    if (verification.visitorId) {
      await SupportConversation.query({ client: trx })
        .where("visitorId", verification.visitorId)
        .update({ customerId: target.id, visitorId: null });
    }
    const verifications = CustomerEmailVerification.query({ client: trx }).whereRaw(
      "LOWER(email) = ?",
      [verification.email.toLowerCase()]
    );
    if (verification.visitorId) verifications.orWhere("visitorId", verification.visitorId);
    await verifications.delete();
    return target;
  });

  return { status: "verified", customer } as const;
}
