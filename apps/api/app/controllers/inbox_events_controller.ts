import { inboxEventStream } from "#services/inbox_event_stream";
import type { HttpContext } from "@adonisjs/core/http";
import { PassThrough } from "node:stream";

export default class InboxEventsController {
  async index({ request, response }: HttpContext) {
    const stream = new PassThrough();
    const write = (event: unknown) =>
      stream.write(`event: inbox.changed\ndata: ${JSON.stringify(event)}\n\n`);
    const unsubscribe = inboxEventStream.subscribe(write);
    const heartbeat = setInterval(() => stream.write(": keep-alive\n\n"), 20_000);
    const close = () => {
      clearInterval(heartbeat);
      unsubscribe();
      stream.end();
    };
    request.request.once("close", close);

    response.header("content-type", "text/event-stream; charset=utf-8");
    response.header("cache-control", "no-cache, no-transform");
    response.header("connection", "keep-alive");
    response.header("x-accel-buffering", "no");
    stream.write(`event: connected\ndata: {"connected":true}\n\n`);
    return response.stream(stream);
  }
}
