# PRD: Customer HITL Booking Confirmation

**Status:** Implemented  
**Product area:** Oak & Pine customer demo  
**Primary human:** Customer  
**Initial action:** Reschedule an existing booking  
**Future action:** Owner confirmation for confirmed bookings (out of scope)

## Summary

Replace model-inferred confirmation with Mastra's native human-in-the-loop tool approval.

When the agent knows the booking and exact replacement time, it calls `reschedule_booking`. Mastra suspends the call before execution and emits a `tool-call-approval` stream chunk. The demo renders that proposal as a compact card above the composer.

The customer can:

- Click **Confirm** to approve the suspended tool call.
- Click **Decline** without entering a reason.
- Type a reply such as “No, let's do 3 PM instead.” While an approval is pending, every composer reply declines the current call and becomes the optional decline reason. The agent can then propose a new exact call and the UI renders a new card.

## Problem

The original flow asked for confirmation in assistant prose. The customer typed an answer such as “yes,” and the model decided whether that counted as consent before calling the mutation.

That made consent implicit, made the UI unable to distinguish an actionable request from ordinary text, and made it possible for model interpretation to sit in front of a consequential write.

## Goals

- Prevent `reschedule_booking` from executing until the customer clicks **Confirm**.
- Use Mastra's structured approval state instead of assistant prose.
- Show the exact proposed booking change in a compact, accessible card.
- Support one-click decline and optional natural-language corrections.
- Resume the suspended agent stream after either decision.
- Keep the private booking capability and fixed demo-customer identity in Adonis.
- Preserve pending cards across page refresh in the demo's existing local thread state.

## Non-goals

- Owner or staff approval.
- Cross-device approval persistence.
- An approval database or CRM approval queue.
- Multiple simultaneous approvals in one demo conversation.
- Generalizing HITL to every tool.
- Replacing the demo's local-only conversation model.

## Confirmed behavior

- Only `reschedule_booking` requires approval.
- The actions are **Confirm** and **Decline**.
- A decline reason is optional.
- The composer remains enabled while a card is pending.
- Every typed reply while pending—including “yes”—declines the current call.
- Typed text is forwarded verbatim as the decline reason.
- A corrected exact time creates a new Mastra tool call and therefore a new approval identity.
- Success is reported only after the approved tool executes successfully.

## User experience

The card appears immediately above the normal composer. It is application UI, not an assistant message bubble.

Example:

> **Confirm booking change?**  
> Window track repair with Noah  
> Fri, Aug 14, 11:30 AM → Thu, Aug 20, 3:00 PM  
> [Decline] [Confirm]

Requirements:

- Show service, staff, current time, and proposed time from the structured tool arguments.
- Format dates in `America/Los_Angeles`; do not render raw timestamps.
- Keep **Confirm** visually primary.
- Keep keyboard order logical: card actions, then composer.
- Announce the pending card and decision state without unexpectedly moving focus.
- Disable both card actions and composer submission while a decision is in flight.
- Show an inline retry message when a decision request fails before Mastra accepts it.

## Interaction flow

### Proposal

1. The customer requests a reschedule.
2. The agent uses `find_bookings_for_customer` when it needs booking details.
3. If the booking or time is ambiguous, the agent asks a normal question.
4. Once both are exact, the agent calls `reschedule_booking` immediately.
5. `requireApproval: true` suspends the call before `execute` runs.
6. The demo consumes Mastra's native `tool-call-approval` chunk and renders the card.

### Confirm

1. The customer clicks **Confirm**.
2. The demo sends the native `runId` and `toolCallId` to the Adonis approval resource.
3. Adonis resolves the fixed demo customer and creates a fresh short-lived booking capability.
4. Adonis calls Mastra's `approve-tool-call` endpoint.
5. Mastra resumes the exact suspended call and streams the result.
6. The card disappears once Mastra accepts the decision.

### Decline

1. The customer clicks **Decline**, or sends a composer message while the card is pending.
2. The demo sends `runId`, `toolCallId`, and the optional reason to the same Adonis approval resource.
3. Adonis calls Mastra's `decline-tool-call` endpoint with a fresh request context.
4. The booking mutation does not run.
5. The resumed agent either asks a concise question or proposes a replacement call.

### Refresh

The demo already keeps its local-only conversations in versioned `localStorage`. The pending approval identity and display fields are persisted with that thread, so the card returns after refresh.

Mastra remains authoritative. The demo does not duplicate suspended-run state in an Adonis table and does not add a custom eager-revalidation endpoint. If a restored approval is stale, Mastra rejects the decision and the UI shows the retry/error state. Cross-device discovery can later use Mastra's native `listSuspendedRuns()` once conversations have server-side thread identity.

## Architecture

### Agent

`reschedule_booking` declares `requireApproval: true`. Its input contains the fields needed to explain the proposal:

```ts
{
  booking_id: number;
  service: string;
  staff: string;
  current_start_time: string;
  new_start_time: string;
}
```

Only `booking_id` and `new_start_time` are sent to the booking mutation endpoint. The remaining fields are presentation context copied from the selected booking.

### Adonis

Adonis exposes two resource-shaped endpoints:

- `POST /api/v1/demo/chats` → `DemoChatsController.store`
- `POST /api/v1/demo/approvals` → `DemoApprovalsController.store`

Both controllers validate with Vine, resolve the fixed demo customer, delegate to the shared business-support-agent service, and stream Mastra's response unchanged.

The shared service owns the actual Mastra boundary:

- Mastra base URL and endpoint paths.
- Request timeout and stream headers.
- Customer request context.
- Fresh booking-capability issuance.
- Approve/decline endpoint selection and the neutral default decline reason.

Adonis does not parse Mastra's event stream, persist approval rows, invent opaque approval IDs, normalize another protocol, or implement duplicate lifecycle state.

### Next.js demo

The demo uses the same external rewrite pattern as the workspace application:

```ts
{
  source: "/api/:path*",
  destination: `${getBackendUrl()}/api/:path*`,
}
```

There are no demo-specific Next route handlers. The browser calls the Adonis resource paths through the same-origin rewrite.

### Browser

The stream consumer uses the installed AI SDK's `parseJsonEventStream` to parse Mastra SSE. It handles only the native chunks needed by this UI:

- `text-delta` appends assistant text.
- `tool-call-approval` creates or replaces the pending card.
- `error` and `abort` fail the current interaction.

Other native chunks are ignored rather than translated into a second wire protocol.

## Why this shape

Mastra already owns suspended-run persistence, immutable tool arguments, and decision resumption. Rebuilding those concepts in Adonis created a shallow approval service, a duplicate database lifecycle, four proxy handlers, and a custom event protocol.

The retained seam is the one the application actually needs: Adonis authenticates/scopes the customer context before calls reach the agent. The demo UI then consumes Mastra's public HITL interface directly.

## Security and correctness

- The browser never receives the encrypted booking capability.
- The browser cannot choose the customer ID; Adonis resolves the fixed demo customer.
- Confirm and decline reference a Mastra-suspended tool call; they do not submit replacement mutation arguments.
- A correction must decline the old call and produce a new tool call.
- The UI disables duplicate decisions while a request is active.
- Mastra is the authority for already-resolved or missing runs.
- This demo exposes Mastra `runId` and `toolCallId` to its own browser state. They are locators, not capabilities. This avoids inventing an opaque-ID store solely for the demo.

## Acceptance criteria

1. An exact reschedule emits `tool-call-approval` without a prose confirmation request.
2. The booking mutation does not execute before approval.
3. The card appears above the composer with old and proposed booking details.
4. Clicking **Confirm** resumes the original call and streams the result.
5. Clicking **Decline** performs no mutation and works without a reason.
6. Typing “No, let's do 3 PM instead” declines with that exact reason.
7. Typing “yes” does not approve.
8. A replacement proposal replaces the old card with a distinct native approval identity.
9. Refresh restores the pending card from versioned local thread state.
10. The booking capability and customer selection remain server-side.
11. Ordinary support chat and booking lookup continue to work.
12. The card is keyboard-accessible and fits the narrow demo widget.

## Test plan

- Agent source test: only the reschedule tool has `requireApproval: true` and the gate is declared before `execute`.
- API functional tests: native streams pass through unchanged, request context includes a valid server-issued capability, and approve/decline decisions reach the correct Mastra endpoints with the optional reason.
- Demo tests: typed replies always decline, native chunks are parsed directly, the Adonis rewrite is used, approval identity persists, and controls retain accessible labels/focus styles.
- Full repository typecheck, lint, test, and build.

## Implementation map

- `apps/agent/tools/bookings.ts`
- `apps/agent/agents/business-support.ts`
- `apps/api/app/services/business_support_agent.ts`
- `apps/api/app/controllers/demo_chats_controller.ts`
- `apps/api/app/controllers/demo_approvals_controller.ts`
- `apps/api/app/validators/demo_agent.ts`
- `apps/api/start/routes.ts`
- `apps/demo/next.config.ts`
- `apps/demo/lib/business-support-agent.ts`
- `apps/demo/lib/support-state.ts`
- `apps/demo/components/support-studio.tsx`
- `apps/demo/app/globals.css`

## References

- [Mastra: Human-in-the-loop](https://mastra.ai/docs/agents/human-in-the-loop)
- [Mastra: When to use agent approval](https://mastra.ai/blog/human-in-the-loop-when-to-use-agent-approval)
