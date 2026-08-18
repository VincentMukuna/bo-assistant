import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../components/support-studio.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const agentClient = readFileSync(
  new URL("../lib/business-support-agent.ts", import.meta.url),
  "utf8"
);
const supportState = readFileSync(new URL("../lib/support-state.ts", import.meta.url), "utf8");

test("routes every typed reply through decline while approval is pending", () => {
  assert.match(
    component,
    /if \(activeThread\.pendingApproval\)[\s\S]*?decideApproval\(activeThread\.id, activeThread\.pendingApproval, "decline", body\)/
  );
  assert.doesNotMatch(component, /body\s*===?\s*["']yes["'][\s\S]*?"confirm"/i);
});

test("consumes Mastra approval chunks directly through the Adonis rewrite", () => {
  assert.match(agentClient, /parseJsonEventStream/);
  assert.match(agentClient, /chunk\.type !== "tool-call-approval"/);
  assert.match(agentClient, /payload\.toolName === "rescheduleBooking"/);
  assert.match(agentClient, /post\("\/api\/v1\/demo\/chats"/);
  assert.match(agentClient, /"\/api\/v1\/demo\/approvals"/);
  assert.doesNotMatch(agentClient, /x-demo-chat-protocol/);
  assert.match(nextConfig, /source: "\/api\/:path\*"/);
});

test("persists native approval identity and renders accessible actions", () => {
  assert.match(supportState, /SUPPORT_STATE_VERSION\s*=\s*3/);
  assert.match(supportState, /pendingApproval\?: PendingApproval/);
  assert.match(agentClient, /runId: string/);
  assert.match(agentClient, /toolCallId: string/);
  assert.match(component, /aria-label={`Confirm change for \$\{approval\.service\}`}/);
  assert.match(component, /aria-label={`Decline change for \$\{approval\.service\}`}/);
  assert.match(component, /aria-live="polite"/);
  assert.match(styles, /\.chat-approval\s*{/);
  assert.match(styles, /\.chat-approval-actions button:focus-visible/);
});
