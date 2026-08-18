# PRD: Workspace Inbox

**Status:** Working version implemented  
**Product area:** Business-owner workspace  
**Primary user:** Owner-operator  
**Initial customer channel:** Oak & Pine website chatbot

## Summary

The Workspace Inbox is where a business owner safely delegates customer work to the agent while
retaining control of important business commitments.

It contains every customer conversation, but it is organized around operational responsibility
rather than functioning as a conventional communications hub. The owner should be able to open the
Inbox and quickly understand:

1. What needs me?
2. What is the agent handling?
3. Who is responsible for the next step?
4. Was the promised business outcome actually completed?

The agent remains the default handler. The owner intervenes when the agent reaches an authority,
judgment, relationship, or failure boundary. After the owner supplies the missing decision or takes
over a sensitive exchange, responsibility can return to the agent.

## Product promise

> The Inbox gives the owner confidence that customer work is being handled without important
> commitments escaping their control.

Time savings are a consequence of safe delegation, not the only measure of value. The Inbox must
balance autonomy with enough visibility and control for the owner to trust the agent.

## Current context

The Oak & Pine website chatbot already supports durable customer conversations and a working
customer-approved booking-reschedule flow through Adonis and Mastra. The workspace Inbox and Agent
Activity tabs are currently demo-backed.

The existing reschedule approval protects customer consent. The Workspace Inbox introduces a
different concern: business authority. A customer may consent to a change while the business still
requires owner approval before its calendar or another commitment changes.

## Problem

A normal inbox assumes a person is responsible for reading and responding to every conversation.
That would undermine the purpose of adding an agent. A pure agent activity feed has the opposite
problem: it may show what happened, but it does not give the owner an effective place to make a
decision, intervene in a customer relationship, or verify that the underlying work was completed.

The owner needs one customer-centered surface that:

- preserves visibility across all conversations;
- separates routine agent-handled work from work needing human attention;
- prevents protected business commitments from changing silently;
- lets the owner intervene without permanently taking work away from the agent; and
- reports concrete operational outcomes rather than treating a reply as completion.

## Goals

- Make all website-chat conversations available to the owner.
- Foreground conversations that require owner attention without hiding agent-handled work.
- Let the agent handle routine communication, investigation, and preparation independently.
- Request owner involvement only at a genuine human boundary.
- Give the owner enough context to make a decision without reconstructing the entire conversation.
- Support temporary owner intervention and a clear return of responsibility to the agent.
- Show whether the requested business outcome was completed, declined, blocked, or is still waiting.
- Make agent behavior understandable through concise internal milestones in the conversation.
- Keep the active Inbox current through server-pushed updates without scheduled polling.

## Non-goals for the working version

- Becoming a general-purpose manual communications hub.
- SMS, email, social, phone, or other channel integrations.
- Team assignment, routing, mentions, shifts, or collaborative ownership.
- Canned responses, campaigns, bulk messaging, or outbound conversation management.
- SLA management, support analytics, or elaborate inbox rules.
- A conditional policy builder for every possible approval scenario.
- Exposing raw tool calls, chain-of-thought, or a comprehensive agent execution trace.
- Replacing the Agent Activity tab.

## Primary user

The initial product is for a single owner-operator who remains accountable for customer
commitments even when the agent handles most customer communication.

The owner is not expected to monitor the Inbox continuously or manually reply to routine messages.
They use it to supervise delegated work, supply judgment or authority when needed, protect customer
relationships, and confirm that important outcomes occurred.

## Product model

### 1. Every conversation is visible

The Inbox is the complete customer-conversation record for the supported channel. Conversations do
not disappear merely because the agent handled them without assistance. This visibility lets the
owner inspect past interactions, build trust in the agent, and understand a customer's history.

Visibility does not imply equal prominence. Conversations requiring owner action must outrank
routine or completed conversations.

### 2. Operational responsibility drives priority

The Inbox prioritizes conversations according to who owns the next meaningful step:

1. **Owner** — a decision, approval, or human response is needed.
2. **Agent** — the agent is actively handling the request.
3. **Customer** — progress is waiting on customer information or consent.
4. **Nobody** — the requested outcome is complete or deliberately closed.

Recency is a secondary ordering signal. A recent thank-you should not outrank an older unresolved
owner decision.

These are product responsibilities, not a required UI taxonomy. The implementation pass may choose
different labels or presentation while preserving this meaning.

### 3. Owner attention has four legitimate causes

A conversation should require the owner only when it reaches one of these boundaries:

- **Authority:** The agent has prepared an action it is not permitted to take alone.
- **Judgment:** The request falls outside known policy or has no clearly correct answer.
- **Relationship:** The customer requests a person, is upset, or needs human care.
- **Failure:** The agent or a connected business system cannot complete the work reliably.

Routine reading, clarification, policy lookup, availability checking, and response generation do
not require approval.

### 4. Approval protects commitments, not agent reasoning

The owner does not approve every request or intermediate agent step. The agent should independently
do the work required to reach a decision-ready proposal. Approval is requested only before crossing
an undelegated authority boundary.

Initial sensible defaults are:

- **New booking:** requires owner confirmation by default; the business may enable automatic
  approval for valid new bookings.
- **Change to a confirmed booking:** requires owner approval by default so the calendar does not
  shift without the owner's knowledge.
- **Cancellation of a confirmed booking:** requires owner approval by default.
- **Read-only work and ordinary customer communication:** never require owner approval merely
  because the agent performed them.

Customer consent and business approval are distinct. Exact sequencing and how multiple approvals
are represented are implementation-pass decisions.

### 5. Intervention is temporary

The agent remains the default handler of a conversation. When the owner provides an approval,
decision, or correction, the agent should be able to continue the workflow and customer
communication.

For sensitive interactions, the owner can take over the customer exchange. Completing that moment
does not permanently convert the conversation into a manually managed thread; responsibility can
return to the agent.

### 6. Completion means the business outcome occurred

A message being sent is not sufficient evidence of completion. The Inbox should distinguish what
was discussed from what actually happened.

For a booking change, completion means the authoritative booking was changed and the customer was
notified. If an action failed, became stale, was declined, or still awaits someone, the conversation
must not appear successfully handled.

### 7. Agent annotations provide local operational context

The conversation may contain business-internal agent annotations alongside customer and business
messages. These annotations should record only decision-relevant milestones and outcomes, such as:

- identifying the relevant booking;
- completing a material policy or availability check;
- reaching an owner boundary;
- transferring responsibility;
- completing or failing the promised action.

They are not customer-visible messages, raw tool logs, or hidden model reasoning.

## Core owner jobs

### See what needs attention

The owner can distinguish conversations requiring them from those being handled by the agent,
waiting on the customer, or already complete.

### Make a decision with sufficient context

When authority or judgment is required, the owner can understand:

- what the customer wants;
- what the agent established;
- the exact proposed business action;
- the expected impact on the business or calendar;
- why the owner is needed; and
- what will happen after the decision.

### Protect a customer relationship

The owner can enter a conversation when a customer requests a human or the interaction becomes
sensitive. The agent must not continue speaking as the business while the owner owns the exchange.

### Recover blocked work

When automation or a connected system fails, the owner can see that the outcome is incomplete and
understand whether human action is needed. Failure must not be presented as success or quietly
buried in an activity log.

### Verify the outcome

The owner can tell what changed in the business system and whether the customer was informed,
without inferring completion from conversational prose.

### Inspect agent-handled conversations

The owner can browse conversations that did not require intervention to understand customer history
and build confidence in how the agent represents the business.

## Default conversation journey

1. A customer starts or continues a website-chat conversation.
2. The agent owns the request and independently gathers information, clarifies ambiguity, and
   performs work within its delegated authority.
3. If no human boundary is reached, the agent completes the business outcome, informs the customer,
   and records a concise outcome annotation.
4. If an authority, judgment, relationship, or failure boundary is reached, responsibility moves to
   the owner and the conversation is prioritized accordingly.
5. The owner supplies the decision, approval, correction, or human response.
6. Responsibility returns to the agent when appropriate so it can finish the workflow and customer
   follow-up.
7. The conversation is considered handled only when the outcome is complete, deliberately declined,
   or clearly closed with no remaining responsibility.

## Relationship to Agent Activity

The two tabs answer different questions:

- **Inbox:** “What is happening with this customer?” It is customer-centered and supports live
  responsibility, intervention, and outcome verification.
- **Agent Activity:** “What has my agent been doing?” It is agent-centered and supports
  business-wide retrospective oversight, including work that never required owner attention.

Important agent milestones may appear in both places. In the Inbox they explain a specific customer
conversation; in Agent Activity they contribute to the broader record of agent work.

## Working-version requirements

The working version is product-complete when:

1. The owner can access every durable website-chat conversation in the workspace.
2. Conversations needing the owner are clearly distinguishable from routine agent-handled work.
3. The owner can understand who owns the next step in an active conversation.
4. The four attention causes can be represented without treating ordinary messages as owner tasks.
5. A protected business action cannot complete without the required business authority.
6. An attention item presents decision-ready context rather than forcing the owner to reconstruct
   the request from the full transcript.
7. The owner can intervene in a customer exchange without the agent replying concurrently.
8. The agent can resume responsibility after an owner decision or temporary takeover.
9. Internal annotations explain material agent milestones without exposing implementation details.
10. Completed work reports the concrete business outcome; failed or incomplete work remains visibly
    unresolved.
11. Agent-handled and completed conversations remain available for oversight.
12. Existing customer-side consent protections remain intact.
13. Conversation, responsibility, attention, and outcome changes reach the active workspace through
    a live server-pushed stream rather than scheduled polling.

## Success criteria

Initial success is demonstrated when:

- an owner can open the Inbox and identify all work needing them without reading every conversation;
- routine customer requests complete without creating unnecessary owner work;
- the owner is not surprised by protected changes to confirmed business commitments;
- owner intervention resolves an exception without permanently disabling agent assistance;
- the owner can distinguish a message sent from an authoritative business action completed; and
- agent-handled conversations remain understandable enough to support trust and accountability.

Exact analytics and quantitative targets should be chosen after the working version produces real
usage data.

## Working-version implementation

- Adonis owns durable responsibility, attention, outcome, handoff, and annotation state.
- Mastra remains the source of conversation messages and agent execution; the booking database
  remains the calendar authority.
- A confirmed-booking reschedule requires owner authorization before the customer's existing consent
  can mint the exact mutation grant and resume the agent.
- Owner takeover blocks new automatic agent replies. Owner replies are written to the same Mastra
  thread, and releasing takeover returns responsibility to the agent.
- The workspace loads an authenticated REST snapshot and reconciles targeted conversation queries
  from an authenticated SSE stream. It does not use scheduled polling.

## Later product and scale decisions

- Where approval settings live and how new-booking auto-approval is configured.
- Multi-instance event delivery, durable replay, unread behavior, and notification delivery.
- How Inbox events project into Agent Activity without duplicating authority.
- Team assignment, additional communication channels, analytics targets, and rollout observability.
