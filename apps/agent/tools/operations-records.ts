import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const operationsContextSchema = z.object({
  operationsCapability: z.string().min(1),
});

const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  contact: z.string(),
  status: z.string(),
  nextStep: z.string(),
  handling: z.string(),
  outcome: z.string(),
  outcomeSummary: z.string().nullable(),
  attentionItems: z.array(z.record(z.string(), z.unknown())),
  annotations: z.array(z.record(z.string(), z.unknown())),
  messages: z.array(z.record(z.string(), z.unknown())),
  href: z.string(),
});

const bookingApiSchema = z.object({
  id: z.number().int().positive(),
  customer: z.string(),
  service: z.string(),
  staff: z.string(),
  scheduledAtDisplay: z.string(),
  durationMinutes: z.number().int().positive(),
  status: z.string(),
  serviceAddress: z.string(),
  href: z.string(),
});

const bookingSchema = bookingApiSchema.extend({ serviceAddress: z.string().nullable() });

function apiUrl() {
  return (process.env.API_URL ?? "http://localhost:3333").replace(/\/$/, "");
}

async function readOperationsRecord<T>(path: string, capability: string, schema: z.ZodType<T>) {
  const response = await fetch(`${apiUrl()}${path}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${capability}`,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`The operations API rejected ${path} with status ${response.status}.`);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`The operations API returned an invalid response for ${path}.`);
  }
  return parsed.data;
}

export const getConversation = createTool({
  id: "get_conversation",
  description:
    "Read one specific workspace conversation when the supplied page context does not contain enough conversation detail or the user asks for its current state. Do not call this merely to repeat a conversation already present in context.",
  inputSchema: z.object({ conversation_id: z.string().min(1) }),
  outputSchema: z.object({ conversation: conversationSchema }),
  requestContextSchema: operationsContextSchema,
  execute: (input, { requestContext }) =>
    readOperationsRecord(
      `/api/v1/agent/operations/conversations/${encodeURIComponent(input.conversation_id)}`,
      requestContext.all.operationsCapability,
      z.object({ conversation: conversationSchema })
    ),
});

export const getBooking = createTool({
  id: "get_booking",
  description:
    "Read one authoritative booking record. Use it when an answer or decision depends on the booking's current schedule, staff assignment, duration, status, service, or address. Its values override copied booking details in notifications or conversation history. The address is omitted by default; request it only when location or access affects the user's question.",
  inputSchema: z.object({
    booking_id: z.number().int().positive(),
    include_address: z.boolean().optional(),
  }),
  outputSchema: z.object({ booking: bookingSchema }),
  requestContextSchema: operationsContextSchema,
  execute: async (input, { requestContext }) => {
    const result = await readOperationsRecord(
      `/api/v1/agent/operations/bookings/${input.booking_id}`,
      requestContext.all.operationsCapability,
      z.object({ booking: bookingApiSchema })
    );
    return {
      booking: {
        ...result.booking,
        serviceAddress: input.include_address === true ? result.booking.serviceAddress : null,
      },
    };
  },
});
