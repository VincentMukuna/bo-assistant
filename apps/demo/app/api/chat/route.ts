import { createTextStreamResponse, jsonSchema, parseJsonEventStream } from "ai";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type MastraStreamChunk = {
  type?: unknown;
  payload?: unknown;
};

export const maxDuration = 60;

function isValidMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 30 &&
    value.every(
      (message) =>
        message &&
        typeof message === "object" &&
        "role" in message &&
        (message.role === "user" || message.role === "assistant") &&
        "content" in message &&
        typeof message.content === "string" &&
        message.content.trim().length > 0 &&
        message.content.length <= 4_000
    )
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages =
    body && typeof body === "object" && "messages" in body ? body.messages : undefined;
  if (!isValidMessages(messages)) {
    return Response.json({ error: "A valid message history is required." }, { status: 400 });
  }

  const apiUrl = (process.env.ADONIS_URL ?? "http://localhost:3333").replace(/\/$/, "");

  try {
    const response = await fetch(`${apiUrl}/api/v1/demo/chat`, {
      method: "POST",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({ messages }),
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(55_000)]),
    });

    if (!response.ok) {
      return Response.json({ error: "The assistant is unavailable right now." }, { status: 502 });
    }

    if (!response.body) {
      return Response.json({ error: "The assistant returned an empty response." }, { status: 502 });
    }

    const events = parseJsonEventStream({
      stream: response.body,
      schema: jsonSchema<MastraStreamChunk>({}),
    });
    let hasText = false;
    const textStream = events.pipeThrough(
      new TransformStream({
        transform(event, controller) {
          if (!event.success) {
            throw new Error("The assistant returned an invalid stream.", { cause: event.error });
          }

          const chunk = event.value;
          if (chunk.type === "error" || chunk.type === "abort") {
            throw new Error("The assistant stream ended unexpectedly.");
          }

          if (
            chunk.type === "text-delta" &&
            chunk.payload &&
            typeof chunk.payload === "object" &&
            "text" in chunk.payload &&
            typeof chunk.payload.text === "string"
          ) {
            hasText = true;
            controller.enqueue(chunk.payload.text);
          }
        },
        flush() {
          if (!hasText) {
            throw new Error("The assistant returned an empty response.");
          }
        },
      }),
    );

    return createTextStreamResponse({
      stream: textStream,
      headers: {
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  } catch {
    return Response.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
