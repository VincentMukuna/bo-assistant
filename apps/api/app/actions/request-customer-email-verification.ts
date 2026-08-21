import CustomerEmailVerification from "#models/customer_email_verification";
import Customer from "#models/customer";
import env from "#start/env";
import mail from "@adonisjs/mail/services/main";
import { DateTime } from "luxon";
import { createHash, randomBytes } from "node:crypto";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export { tokenHash as hashCustomerEmailVerificationToken };

export default async function requestCustomerEmailVerification(input: {
  customer: Customer;
  email: string;
  name?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await Customer.query().whereRaw("LOWER(email) = ?", [email]).first();
  const customer = existing ?? input.customer;

  if (
    customer.id === input.customer.id &&
    customer.emailVerifiedAt &&
    customer.email?.toLowerCase() === email
  ) {
    return { customer, alreadyVerified: true } as const;
  }

  await CustomerEmailVerification.query()
    .where("customerId", customer.id)
    .orWhereRaw("LOWER(email) = ?", [email])
    .delete();

  const token = randomBytes(32).toString("base64url");
  const verification = await CustomerEmailVerification.create({
    id: crypto.randomUUID(),
    customerId: customer.id,
    email,
    name: input.name || null,
    tokenHash: tokenHash(token),
    expiresAt: DateTime.now().plus({ minutes: 15 }),
  });
  const origin = env.get("CUSTOMER_APP_ORIGIN") ?? env.get("APP_URL");
  const verificationUrl = new URL("/", origin);
  verificationUrl.searchParams.set("verify", token);

  try {
    await mail.send((message) => {
      message
        .to(email)
        .subject("Confirm your Oak & Pine email")
        .text(
          `Confirm your email to manage appointments with Oak & Pine:\n\n${verificationUrl}\n\nThis link expires in 15 minutes.`
        )
        .html(
          `<p>Confirm your email to manage appointments with Oak &amp; Pine.</p><p><a href="${verificationUrl}">Confirm email</a></p><p>This link expires in 15 minutes.</p>`
        );
    });
  } catch (error) {
    await verification.delete();
    throw error;
  }

  return { customer, alreadyVerified: false } as const;
}
