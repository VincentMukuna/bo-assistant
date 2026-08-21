import CustomerEmailVerification from "#models/customer_email_verification";
import Customer from "#models/customer";
import env from "#start/env";
import mail from "@adonisjs/mail/services/main";
import { DateTime } from "luxon";
import { createHmac, randomInt } from "node:crypto";

function codeHash(verificationId: string, code: string) {
  return createHmac("sha256", env.get("APP_KEY").release())
    .update(`${verificationId}:${code}`)
    .digest("hex");
}

export { codeHash as hashCustomerEmailVerificationCode };

export default async function requestCustomerEmailVerification(input: {
  customer: Customer | null;
  visitorId: string;
  email: string;
  name?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await Customer.query().whereRaw("LOWER(email) = ?", [email]).first();
  const customer = existing ?? input.customer;

  if (
    customer &&
    customer.id === input.customer?.id &&
    customer.emailVerifiedAt &&
    customer.email?.toLowerCase() === email
  ) {
    return { customer, alreadyVerified: true } as const;
  }

  await CustomerEmailVerification.query()
    .where("visitorId", input.visitorId)
    .orWhereRaw("LOWER(email) = ?", [email])
    .delete();

  const id = crypto.randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const verification = await CustomerEmailVerification.create({
    id,
    customerId: customer?.id ?? null,
    visitorId: input.visitorId,
    email,
    name: input.name || null,
    codeHash: codeHash(id, code),
    expiresAt: DateTime.now().plus({ minutes: 15 }),
  });

  try {
    await mail.send((message) => {
      message
        .to(email)
        .subject("Your Oak & Pine verification code")
        .text(
          `Enter this code to verify your email with Oak & Pine:\n\n${code}\n\nThis code expires in 15 minutes. If you did not request it, you can ignore this email.`
        )
        .html(
          `<p>Enter this code to verify your email with Oak &amp; Pine:</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">${code}</p><p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p>`
        );
    });
  } catch (error) {
    await verification.delete();
    throw error;
  }

  return { customer, alreadyVerified: false, verificationId: verification.id } as const;
}
