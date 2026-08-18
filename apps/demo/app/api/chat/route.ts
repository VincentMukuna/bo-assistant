type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages }),
      cache: "no-store",
      signal: AbortSignal.timeout(50_000),
    });

    if (!response.ok) {
      return Response.json({ error: "The assistant is unavailable right now." }, { status: 502 });
    }

    const result = (await response.json()) as { message?: unknown };
    if (typeof result.message !== "string" || !result.message.trim()) {
      return Response.json({ error: "The assistant returned an empty response." }, { status: 502 });
    }

    return Response.json({ message: result.message.trim() });
  } catch {
    return Response.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
