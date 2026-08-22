import Booking from "#models/booking";
import Customer from "#models/customer";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import { businessSupportAgent, type SeedAgentMessage } from "#services/business_support_agent";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";

const BUSINESS_TIMEZONE = "America/Los_Angeles";

const ids = {
  conversations: {
    bookingApproval: "10000000-0000-4000-8000-000000000001",
    completedLookup: "10000000-0000-4000-8000-000000000002",
    awaitingCustomer: "10000000-0000-4000-8000-000000000003",
    agentHandling: "10000000-0000-4000-8000-000000000004",
  },
  attention: {
    bookingApproval: "20000000-0000-4000-8000-000000000001",
  },
  annotations: {
    bookingApproval: "30000000-0000-4000-8000-000000000001",
    completedLookup: "30000000-0000-4000-8000-000000000002",
    awaitingCustomer: "30000000-0000-4000-8000-000000000003",
    agentHandling: "30000000-0000-4000-8000-000000000004",
  },
} as const;

type DemoCustomerKey = "alice" | "marcus" | "sophie" | "daniel" | "maya";

type DemoCustomerValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  emailVerifiedAt: DateTime;
};

type ConversationSeed = {
  id: string;
  customer: Customer;
  title: string;
  preview: string;
  status: string;
  nextStepOwner: "agent" | "owner" | "customer" | "none";
  handlingMode: "agent" | "owner";
  outcomeStatus: "active" | "completed" | "failed";
  outcomeSummary?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  messages: SeedAgentMessage[];
};

function message(
  idSuffix: string,
  role: "user" | "assistant",
  content: string,
  createdAt: DateTime
): SeedAgentMessage {
  return {
    id: `40000000-0000-4000-8000-${idSuffix.padStart(12, "0")}`,
    role,
    content,
    createdAt: createdAt.toUTC().toISO()!,
  };
}

async function seedConversation(seed: ConversationSeed) {
  const memoryResourceId = `customer:${seed.customer.id}`;
  await businessSupportAgent.seedThread({
    id: seed.id,
    resourceId: memoryResourceId,
    title: seed.title,
    messages: seed.messages,
  });

  return SupportConversation.firstOrCreate(
    { id: seed.id },
    {
      id: seed.id,
      customerId: seed.customer.id,
      visitorId: null,
      memoryResourceId,
      title: seed.title,
      lastMessagePreview: seed.preview,
      status: seed.status,
      nextStepOwner: seed.nextStepOwner,
      handlingMode: seed.handlingMode,
      outcomeStatus: seed.outcomeStatus,
      outcomeSummary: seed.outcomeSummary ?? null,
      firstMessageAt: seed.messages[0]
        ? DateTime.fromISO(seed.messages[0].createdAt)
        : seed.createdAt,
      createdAt: seed.createdAt,
      updatedAt: seed.updatedAt,
    }
  );
}

async function seedShowcaseConversations(
  customers: Record<DemoCustomerKey, Customer>,
  pendingBooking: Booking,
  now: DateTime
) {
  const pendingTime = pendingBooking.scheduledAt
    .setZone(BUSINESS_TIMEZONE)
    .toFormat("cccc 'at' h:mm a");
  const completedTime = now.plus({ days: 2 }).set({ hour: 14, minute: 30 });

  const bookingApproval = await seedConversation({
    id: ids.conversations.bookingApproval,
    customer: customers.daniel,
    title: "Book a door repair",
    preview: "Your request is ready for Oak & Pine to confirm.",
    status: "open",
    nextStepOwner: "owner",
    handlingMode: "agent",
    outcomeStatus: "active",
    createdAt: now.minus({ minutes: 24 }),
    updatedAt: now.minus({ minutes: 18 }),
    messages: [
      message(
        "101",
        "user",
        "Could I book someone to repair the loose hinge on my front door tomorrow afternoon?",
        now.minus({ minutes: 24 })
      ),
      message(
        "102",
        "assistant",
        `I found an opening ${pendingTime}. Your request is ready for Oak & Pine to confirm.`,
        now.minus({ minutes: 18 })
      ),
    ],
  });

  await InboxAttentionItem.firstOrCreate(
    { externalKey: "demo:booking-confirmation" },
    {
      id: ids.attention.bookingApproval,
      conversationId: bookingApproval.id,
      cause: "authority",
      actionType: "booking_confirmation",
      status: "pending",
      externalKey: "demo:booking-confirmation",
      summary: "Daniel Okafor requested a Door hinge repair",
      contextJson: JSON.stringify({
        bookingId: pendingBooking.id,
        service: pendingBooking.service,
        staff: pendingBooking.staff,
        scheduledAt: pendingBooking.scheduledAt.toISO(),
        durationMinutes: pendingBooking.durationMinutes,
      }),
      createdAt: now.minus({ minutes: 18 }),
      updatedAt: now.minus({ minutes: 18 }),
    }
  );
  await InboxAnnotation.firstOrCreate(
    { id: ids.annotations.bookingApproval },
    {
      id: ids.annotations.bookingApproval,
      conversationId: bookingApproval.id,
      kind: "attention",
      summary: "New booking needs confirmation",
      detail: "The agent gathered the service and time, then paused for your decision.",
      createdAt: now.minus({ minutes: 18 }),
    }
  );

  const completedLookup = await seedConversation({
    id: ids.conversations.completedLookup,
    customer: customers.alice,
    title: "Check upcoming deep clean",
    preview: `Your deep clean is confirmed for ${completedTime.toFormat("cccc 'at' h:mm a")}.`,
    status: "closed",
    nextStepOwner: "none",
    handlingMode: "agent",
    outcomeStatus: "completed",
    outcomeSummary: "The agent confirmed the appointment details without needing your help.",
    createdAt: now.minus({ hours: 1, minutes: 5 }),
    updatedAt: now.minus({ minutes: 52 }),
    messages: [
      message(
        "201",
        "user",
        "Can you remind me when my next deep clean is booked?",
        now.minus({ hours: 1, minutes: 5 })
      ),
      message(
        "202",
        "assistant",
        `Your **Deep home clean** is confirmed for ${completedTime.toFormat("cccc, LLLL d 'at' h:mm a")}. Jamie and Rosa are assigned.`,
        now.minus({ minutes: 52 })
      ),
    ],
  });
  await InboxAnnotation.firstOrCreate(
    { id: ids.annotations.completedLookup },
    {
      id: ids.annotations.completedLookup,
      conversationId: completedLookup.id,
      kind: "outcome",
      summary: "Appointment details confirmed automatically",
      detail: "Alice received the date, time, and assigned team without owner involvement.",
      createdAt: now.minus({ minutes: 52 }),
    }
  );

  const awaitingCustomer = await seedConversation({
    id: ids.conversations.awaitingCustomer,
    customer: customers.sophie,
    title: "Drywall repair estimate",
    preview: "Send a photo when you can, and I’ll help narrow down the repair.",
    status: "open",
    nextStepOwner: "customer",
    handlingMode: "agent",
    outcomeStatus: "active",
    createdAt: now.minus({ hours: 2, minutes: 15 }),
    updatedAt: now.minus({ hours: 2 }),
    messages: [
      message(
        "301",
        "user",
        "Can you tell me whether a small dent in drywall can be repaired?",
        now.minus({ hours: 2, minutes: 15 })
      ),
      message(
        "302",
        "assistant",
        "Yes, Oak & Pine handles drywall repairs. Send a photo when you can, and I’ll help narrow down the repair.",
        now.minus({ hours: 2 })
      ),
    ],
  });
  await InboxAnnotation.firstOrCreate(
    { id: ids.annotations.awaitingCustomer },
    {
      id: ids.annotations.awaitingCustomer,
      conversationId: awaitingCustomer.id,
      kind: "activity",
      summary: "Asked customer for a repair photo",
      detail: "The agent answered the service question and is waiting for more detail.",
      createdAt: now.minus({ hours: 2 }),
    }
  );

  const agentHandling = await seedConversation({
    id: ids.conversations.agentHandling,
    customer: customers.marcus,
    title: "Tap repair follow-up",
    preview: "I’m checking the visit details and will update you shortly.",
    status: "open",
    nextStepOwner: "agent",
    handlingMode: "agent",
    outcomeStatus: "active",
    createdAt: now.minus({ hours: 3, minutes: 20 }),
    updatedAt: now.minus({ hours: 3 }),
    messages: [
      message(
        "401",
        "user",
        "The kitchen tap is still dripping after yesterday’s visit. Can you check what was done?",
        now.minus({ hours: 3, minutes: 20 })
      ),
      message(
        "402",
        "assistant",
        "I’m checking the visit details and will update you shortly.",
        now.minus({ hours: 3 })
      ),
    ],
  });
  await InboxAnnotation.firstOrCreate(
    { id: ids.annotations.agentHandling },
    {
      id: ids.annotations.agentHandling,
      conversationId: agentHandling.id,
      kind: "activity",
      summary: "Reviewing a recent service visit",
      detail: "The agent is handling the follow-up and has not escalated it.",
      createdAt: now.minus({ hours: 3 }),
    }
  );
}

export async function seedDemoDataset(options: { includeConversations: boolean }) {
  await User.firstOrCreate(
    { email: "kim@oakandpine.test" },
    { fullName: "Kim Lewis", email: "kim@oakandpine.test", password: "password123" }
  );

  const now = DateTime.now().setZone(BUSINESS_TIMEZONE);
  const today = now.startOf("day");
  const customerSeeds: Array<[DemoCustomerKey, DemoCustomerValues]> = [
    [
      "alice",
      {
        name: "Alice Morgan",
        email: "alice.morgan@example.com",
        phone: "+1 (415) 555-0192",
        address: "1842 Pine Street, San Francisco",
        notes: "Prefers the same cleaning team. Side gate code is 2814. Has a small, friendly dog.",
        emailVerifiedAt: now,
      },
    ],
    [
      "marcus",
      {
        name: "Marcus Lee",
        email: "marcus.lee@example.com",
        phone: "+1 (415) 555-0138",
        address: "731 20th Avenue, San Francisco",
        notes: "Please call on arrival; the front buzzer is unreliable.",
        emailVerifiedAt: now,
      },
    ],
    [
      "sophie",
      {
        name: "Sophie Bennett",
        email: "sophie.b@example.com",
        phone: "+1 (415) 555-0165",
        address: "94 Cole Street, San Francisco",
        notes: "Tenant. Landlord approval is required for repairs over $250.",
        emailVerifiedAt: now,
      },
    ],
    [
      "daniel",
      {
        name: "Daniel Okafor",
        email: "daniel.o@example.com",
        phone: "+1 (415) 555-0107",
        address: "2206 Bryant Street, San Francisco",
        notes: "Best reached by email during work hours.",
        emailVerifiedAt: now,
      },
    ],
    [
      "maya",
      {
        name: "Maya Patel",
        email: "maya.patel@example.com",
        phone: "+1 (415) 555-0177",
        address: "51 Divisadero Street, San Francisco",
        notes: "Uses fragrance-free cleaning products kept under the kitchen sink.",
        emailVerifiedAt: now,
      },
    ],
  ];

  const customers = {} as Record<DemoCustomerKey, Customer>;
  for (const [key, values] of customerSeeds) {
    customers[key] = await Customer.firstOrCreate({ email: values.email }, values);
  }

  const bookingSeeds = [
    [
      customers.marcus,
      "Tap repair",
      "Noah",
      today.minus({ days: 1 }).set({ hour: 11 }),
      90,
      "completed",
    ],
    [customers.maya, "Home clean + oven", "Jamie", today.set({ hour: 9 }), 180, "in_progress"],
    [
      customers.sophie,
      "Drywall repair",
      "Eli",
      today.set({ hour: 14, minute: 30 }),
      120,
      "confirmed",
    ],
    [
      customers.daniel,
      "Door hinge repair",
      "Eli",
      today.plus({ days: 1 }).set({ hour: 13 }),
      60,
      "needs_approval",
    ],
    [
      customers.alice,
      "Deep home clean",
      "Jamie + Rosa",
      today.plus({ days: 2 }).set({ hour: 14, minute: 30 }),
      180,
      "confirmed",
    ],
    [
      customers.alice,
      "Window track repair",
      "Noah",
      today.plus({ days: 4 }).set({ hour: 11, minute: 30 }),
      90,
      "confirmed",
    ],
  ] as const;

  let pendingBooking: Booking | null = null;
  for (const [customer, service, staff, scheduledAt, durationMinutes, status] of bookingSeeds) {
    const booking = await Booking.firstOrCreate(
      { customerId: customer.id, service },
      {
        customerId: customer.id,
        service,
        staff,
        scheduledAt,
        durationMinutes,
        status,
        serviceAddress: customer.address,
      }
    );
    if (status === "needs_approval") pendingBooking = booking;
  }

  if (options.includeConversations && pendingBooking) {
    await seedShowcaseConversations(customers, pendingBooking, now);
  }
}

export async function resetDemoDataset(options: {
  includeConversations: boolean;
  onProgress?: (progress: number, message: string) => void | Promise<void>;
}) {
  // Conversations span SQLite metadata and Mastra's Postgres memory store.
  // Clear the remote side first so a transient failure leaves this reset safe to retry.
  await options.onProgress?.(15, "Clearing old conversations…");
  const deletedThreads = options.includeConversations
    ? await businessSupportAgent.deleteAllThreads()
    : 0;

  await options.onProgress?.(40, "Clearing demo activity…");
  await db.from("inbox_annotations").delete();
  await db.from("inbox_attention_items").delete();
  await db.from("booking_reschedule_grants").delete();
  await db.from("customer_email_verifications").delete();
  await db.from("support_conversations").delete();
  await db.from("bookings").delete();
  await db.from("customers").delete();
  await db.rawQuery("DELETE FROM sqlite_sequence WHERE name IN ('bookings', 'customers')");

  await options.onProgress?.(65, "Rebuilding showcase customers and bookings…");
  await seedDemoDataset(options);
  await options.onProgress?.(92, "Checking the showcase data…");

  return { deletedThreads };
}
