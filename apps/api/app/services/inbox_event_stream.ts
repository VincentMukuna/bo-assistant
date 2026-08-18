import { EventEmitter } from "node:events";

export type InboxEvent = {
  type: "inbox.changed";
  conversationId: string;
  occurredAt: string;
};

class InboxEventStream {
  private emitter = new EventEmitter();

  publish(conversationId: string) {
    const event: InboxEvent = {
      type: "inbox.changed",
      conversationId,
      occurredAt: new Date().toISOString(),
    };
    this.emitter.emit("event", event);
  }

  subscribe(listener: (event: InboxEvent) => void) {
    this.emitter.on("event", listener);
    return () => this.emitter.off("event", listener);
  }
}

export const inboxEventStream = new InboxEventStream();
