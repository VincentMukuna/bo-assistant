# better-result adoption audit

## 1. Scope and repository facts

This audit covers all production TypeScript in the Oak & Pine monorepo:

- `apps/api`: Adonis API, Lucid persistence, customer and owner sessions, booking authority,
  conversation workflows, and the private Mastra adapter.
- `apps/agent`: Mastra agents, booking tools, Postgres memory, DuckDB observability, and date
  presentation.
- `apps/app`: Next.js CRM, Tuyau and raw-fetch API clients, TanStack Query, Inbox SSE, and UI
  presentation.
- `apps/demo`: Next.js customer support demo, raw-fetch and streamed Mastra response client,
  TanStack Query, and UI presentation.

Generated code (`apps/api/.adonisjs`), build output, dependencies, and vendored code are excluded.
Tests were inspected as behavior evidence but are not counted as production coverage.

Repository commands are `npm run lint`, `npm run typecheck`, `npm run test`, and
`npm run build`; focused suites include `npm run test:api` and the `agent` and `demo` workspace
test scripts. The repository uses npm workspaces and Node 24+.

`better-result` 3.0.1 is installed in every TypeScript workspace that owns a Result boundary. This
was a new adoption, not a 2.x-to-3.x migration; the
`migrate-better-result-3` skill therefore has no source migration surface at present.

### Production-area coverage

| Production area               | Entry points                                                                                  |         Reviewed files | Failure mechanisms                                                                                                     | Boundaries                                                                              | Unknowns                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ---------------------: | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Adonis domain and application | 14 controllers, 12 actions, 3 services, 6 middleware, models                                  | 59 files / 2,217 lines | Throws, broad catches, nullable Lucid reads, direct error responses, JSON parsing, compensation                        | HTTP, Lucid, Mastra, SSE, encrypted capability, stored JSON                             | Exact Lucid/driver exception taxonomy and transaction commit failures                |
| Adonis runtime                | `bin/server.ts`, `bin/console.ts`, `bin/test.ts`, routes, provider, exception handler, config | 18 files / 1,137 lines | Process rejection handlers, environment validation, serializer invariant throw                                         | Process, environment, generated Tuyau registry                                          | Adonis exception shapes that should remain framework-owned                           |
| Mastra agent                  | `src/mastra/index.ts`, two agents, booking tools, storage, presentation                       |    6 files / 403 lines | Generic throws, rejected fetch, Zod validation, filesystem/storage startup, date assertions                            | Adonis HTTP, Mastra tool protocol, Postgres, DuckDB/filesystem, observability           | Mastra's supported structured tool-failure contract and SDK operational errors       |
| CRM Next.js app               | App Router pages/layouts, providers, components, `lib/api.ts`                                 | 43 files / 4,981 lines | `ApiError`, rejected fetch/Tuyau requests, React Query error channel, ignored storage/event failures, invariant throws | Browser HTTP, server HTTP, cookies, EventSource, localStorage, generated Tuyau contract | Whether Tuyau can expose discriminated error response types without a manual adapter |
| Customer demo                 | App Router, support studio, raw-fetch/stream client, query hooks                              | 10 files / 1,227 lines | Generic throws, rejected fetch, stream failures, swallowed reconciliation errors, React Query error channel            | Browser HTTP, SSE, session cookie                                                       | AI SDK stream failure/cancellation taxonomy                                          |

## 2. Search evidence and counts

The audit searched production `*.ts` and `*.tsx` files for throws, catches, rejection handlers,
error subclasses, HTTP failures, nullable and empty sentinels, parsing, validation, assertions,
fetch/RPC calls, database calls, serialization, storage, UI error states, logging, and retries.

Representative commands:

```sh
rg -n --glob '*.{ts,tsx}' '\bthrow\b|\bcatch\s*\(|\.catch\s*\(|Promise\.reject|new Error' apps
rg -n --glob '*.{ts,tsx}' 'fetch\s*\(|JSON\.(parse|stringify)|findOrFail|firstOrFail|safeParse' apps
rg -n --glob '*.{ts,tsx}' 'response\.(badRequest|unauthorized|forbidden|notFound|conflict|unprocessableEntity|badGateway)' apps/api
rg -n --glob '*.{ts,tsx}' 'return null|return undefined|return \{\}|isError|retry' apps
```

Grouped occurrence counts:

| Area               | `throw` | `try` | `catch` blocks | `.catch()` | `fetch` | `JSON.parse` | `find/firstOrFail` | direct API error responses | error-state/retry references |
| ------------------ | ------: | ----: | -------------: | ---------: | ------: | -----------: | -----------------: | -------------------------: | ---------------------------: |
| Adonis application |      11 |    14 |             13 |          3 |       1 |            2 |                  8 |                         33 |                            8 |
| CRM app            |       7 |     7 |              4 |          1 |       1 |            1 |                  0 |                          0 |                           24 |
| Customer demo      |       4 |     2 |              3 |          3 |       1 |            0 |                  0 |                          0 |                           11 |
| Mastra agent       |       6 |     0 |              1 |          1 |       1 |            0 |                  0 |                          0 |                            2 |

These are mechanisms, not a target of zero. Several are correct defect boundaries or deliberate
best-effort fallbacks.

## 3. Failure catalog

| ID  | Failure and trigger                                                                       | Current path                                                                                | Proposed disposition                                                                                                                                                                | Context/cause and user mapping                                                     | Boundary/codec                                                                    | Required tests                                                                |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| F01 | Vine rejects request input                                                                | Validator throws; Adonis renders validation response                                        | Framework-owned recoverable transport failure; do not wrap inner domain code around unknown input                                                                                   | Safe field issues; existing 422-style response                                     | No Result envelope; Vine is the request schema                                    | Existing functional validation plus response contract                         |
| F02 | Session, origin, or booking capability is missing/invalid                                 | Middleware returns one of 4 direct 401/403 bodies                                           | Recoverable tagged boundary result where it improves composition; preserve middleware as final HTTP decision                                                                        | No credentials/tokens; plain re-authenticate/forbidden message                     | Opaque encrypted capability, not a Result envelope                                | Missing, expired, malformed, wrong-origin, wrong-scope                        |
| F03 | Customer, booking, conversation, or attention row is absent                               | Mix of nullable `.first()` checks and 8 `findOrFail`/`firstOrFail` calls                    | Named recoverable error when the caller makes a decision; retain framework 404 only for trivial CRUD endpoints if no inner caller exists                                            | Resource type and safe identifier; user-safe not-found copy                        | HTTP mapping at controller                                                        | Each public not-found variant and no accidental 500                           |
| F04 | Lucid query, transaction, save, or delete fails operationally                             | Promise rejects through actions/controllers; several broad catches turn it into 502         | Specific store-unavailable tagged errors at action/capability boundaries; unresolved driver exceptions temporarily documented as `UnhandledException`                               | Operation, safe IDs, original cause; “try again, no confirmed change”              | No serialized Result at DB call; in-process adapter Result                        | Query, save, rollback, and commit failure; no partial state                   |
| F05 | Reschedule time is past, booking is missing/stale/ineligible, or staff overlaps           | `BookingRescheduleError` throws with embedded HTTP status; controller uses `instanceof`     | Separate tagged recoverable errors; remove HTTP policy from action                                                                                                                  | Booking ID, observed status/times; specific safe conflict message                  | Proposed Result-coded internal booking response                                   | Every variant, short-circuit, rollback, idempotent replay                     |
| F06 | Reschedule grant is missing, expired, or does not match                                   | Generic `BookingRescheduleGrantError`; controller maps to 401                               | One public `RescheduleNotAuthorized` tag because the caller has one behavior; retain a structured internal reason only if needed for telemetry                                      | Tool-call/booking IDs only, never capability; do not reveal grant detail           | Same internal booking codec as F05                                                | Missing, expired, altered time, wrong customer/booking                        |
| F07 | Adonis cannot reach Mastra, times out, receives non-2xx, invalid JSON, or an empty stream | `BusinessSupportAgentClient` throws generic `Error`; broad controller catches return 502    | `AgentUnavailable`, `AgentTimedOut`, `AgentRejectedRequest`, `InvalidAgentResponse`, `EmptyAgentStream`                                                                             | Endpoint operation, status, redacted cause; user gets retryable availability copy  | Mastra protocol is fixed; validate wire payload, convert to in-process Result     | Network, timeout/cancel, each response class, malformed payload, empty stream |
| F08 | Conversation thread is created but Adonis mapping fails                                   | Catch attempts thread deletion, swallows cleanup failure, rethrows original                 | Result-based compensation preserving primary failure and recording cleanup failure separately                                                                                       | Thread/conversation ID and both causes; state-safety message                       | Adonis-to-Mastra boundary as F07                                                  | Create failure with successful and failed compensation                        |
| F09 | Title generation or title synchronization fails                                           | Background promise logs or becomes part of `allSettled`; chat continues                     | Explicit recoverable optional-capability error, handled with `tryRecover`/observation at workflow policy                                                                            | Conversation ID and safe cause; no user error because chat remains usable          | Mastra boundary as F07                                                            | Chat success despite title failure; telemetry path                            |
| F10 | SSE event sent by Mastra is non-JSON or malformed                                         | Server summary parser ignores non-JSON; browser EventSource ignores malformed data          | Keep deliberate reconciliation fallback where protocol permits unknown events; tag terminal/contract-invalid stream failures                                                        | Conversation ID and chunk type, never raw sensitive body                           | Native SSE, no outer Result envelope; validate known chunks                       | Unknown event ignored; malformed required event fails; reconnect reconciles   |
| F11 | Approval state is missing, multiple, stale, invalid, or already decided                   | Controllers return 404/409/422 sentinels inside large workflows                             | Tagged errors from focused approval/attention actions; compose and match once in controller                                                                                         | Conversation/attention IDs and safe state; existing corrective messages            | Browser HTTP boundary decision remains open                                       | Every state transition, concurrent/stale decision, unchanged booking          |
| F12 | Persisted `InboxAttentionItem.contextJson` is corrupt or structurally invalid             | Getter catches JSON error and silently returns `{}`                                         | `InvalidAttentionContext` recoverable storage-boundary error; never synthesize an empty valid-looking context                                                                       | Attention ID, schema issues/cause; owner sees action requires review               | Named storage schema; no stored Result envelope unless persistence format changes | Invalid JSON, wrong fields, valid round trip, safe failure transition         |
| F13 | Serializer receives impossible paginator metadata                                         | Provider throws generic `Error`                                                             | Defect: explicit `panic` with observed safe metadata shape                                                                                                                          | Invariant and serializer operation; outer telemetry only                           | Process/request defect boundary                                                   | Unit assertion that invalid metadata panics                                   |
| F14 | Production internal token or required environment is missing                              | Startup throws or environment service rejects                                               | Defect/configuration failure at process entry; retain loud termination, optionally use `panic`                                                                                      | Variable name and remediation, never secret value                                  | Environment/process boundary                                                      | Production boot fails; development fallback remains intentional               |
| F15 | CRM Tuyau/raw fetch rejects, returns non-2xx, malformed JSON, or an unknown body          | Converted to status-only `ApiError` or raw exception                                        | Typed client errors: `ApiUnavailable`, `ApiRejectedRequest`, `InvalidApiResponse`; preserve stable public code and retry facts                                                      | Method/path template, status, code, redacted cause; UI mapping at feature boundary | Dedicated HTTP error schema; Result envelope decision below                       | Network, invalid body, each stable code, safe fallback copy                   |
| F16 | Profile request is unauthorized                                                           | Thrown `ApiError(401)` caught twice and converted to `null`                                 | `Unauthorized` Result recovered to `null` at auth policy boundary                                                                                                                   | No sensitive details; login UI                                                     | Same browser HTTP contract as F15                                                 | Server and client auth recovery; other errors propagate                       |
| F17 | TanStack Query needs error and retry state                                                | Query functions reject; retry uses status `< 500`; UI reads `unknown`                       | Keep a thin framework adapter that throws a tagged error only at Query's rejection boundary; retry by tag/retryability                                                              | Tagged error remains available to UI; no message parsing                           | No additional wire codec                                                          | Retryable vs non-retryable and rendered feature copy                          |
| F18 | Browser storage is unavailable or Inbox event JSON is malformed                           | Catch and retain default layout/full reconciliation                                         | Deliberate best-effort fallback; no Result unless telemetry becomes a requirement                                                                                                   | No user impact; no raw storage payload logs                                        | Browser-local boundary                                                            | Layout/event behavior remains usable                                          |
| F19 | React auth hook is used outside provider or an impossible UI state is asserted            | Generic `Error` throw                                                                       | Defect: `panic` or retained framework invariant throw                                                                                                                               | Component/hook invariant; developer-only                                           | React error boundary                                                              | Misuse test only if repository establishes component tests                    |
| F20 | Demo request or streamed agent response fails/interruption occurs                         | Generic `Error`; mutation state displays first message; reconciliation errors are swallowed | Typed request and stream errors; bridge once into TanStack mutation rejection                                                                                                       | Conversation ID, response class, retryability; current inline user copy            | Native HTTP/SSE; no Result envelope unless demo API contract changes              | Network, non-2xx, empty/invalid/interrupted stream, reconciliation retry      |
| F21 | Agent booking API rejects, is unreachable, or returns malformed booking JSON              | Fetch/JSON assumptions and generic `Error` thrown from tool                                 | Typed Adonis adapter Result with schema validation; Mastra execution boundary deliberately translates to supported tool failure                                                     | Operation, status/code, safe booking ID, cause; model-safe tool message            | Proposed shared internal Result codec with Adonis producer                        | Success/error round trips, malformed payload, timeout, redaction              |
| F22 | Mastra tool call lacks its framework-provided tool-call ID                                | Generic `Error`                                                                             | Defect if Mastra guarantees the field for an executing approval-required tool; otherwise recoverable `MissingApprovalReference`. Contract must be verified                          | Tool name/run facts; no browser exposure                                           | Mastra SDK boundary                                                               | Contract-specific missing-context behavior                                    |
| F23 | Agent date input/current date/timezone is invalid                                         | `RangeError` from pure formatter                                                            | Split by authority: invalid internal current date/timezone is a defect; invalid external booking timestamp is a recoverable presentation error                                      | Field name and safe value classification; model-safe fallback                      | Tool response validation before formatter                                         | Invalid timestamp, calendar date, and timezone; valid relative dates          |
| F24 | Postgres, DuckDB, filesystem, observability, or Mastra SDK fails                          | Mostly SDK/startup rejection outside application-specific handling                          | Startup configuration/invariant failures panic; documented runtime outages become named storage/agent errors at supervisors; unknown SDK behavior remains an explicit investigation | Store/operation and redacted cause                                                 | SDK/storage boundary, no Result envelope                                          | Startup and runtime failure tests where injectable                            |

## 4. End-to-end propagation paths

### Booking mutation

`Mastra reschedule tool → agent fetch adapter → capability middleware → reschedule controller →
grant lookup → transaction/booking checks → Lucid save → serialized HTTP response → tool output`.

Before migration, the source action threw an HTTP-aware exception, the grant action threw another
generic exception, the controller caught both, and the agent converted every rejected response back
into a generic exception. The implemented slice now keeps a typed error union from
grant/domain/store source to the controller, maps stable structured HTTP failures, validates them in
the agent adapter, and ends Result only at Mastra's required tool-execution boundary.

### Customer and owner conversation workflows

`Browser → Adonis session/origin middleware → conversation controller/action → Lucid mapping →
Mastra HTTP/SSE → browser stream → TanStack mutation/reconciliation`.

Today broad controller catches collapse upstream failures and defects to 502, while title and
cleanup failures are partly swallowed. The target workflow assigns explicit policy to primary
delivery, optional title generation, mapping compensation, stream observation, and reconciliation.

### CRM reads and writes

`Server component or browser Query → Tuyau/raw fetch → Adonis auth/validator/controller → Lucid →
HTTP response → ApiError → retry/UI`.

Today status is the only stable client discriminant and malformed bodies are asserted. The target
client validates the public error payload, returns tagged Results internally, recovers auth at the
auth boundary, and adapts typed errors into TanStack's rejection channel once.

### Owner approval state

`Inbox query/SSE → persisted attention context → owner decision → Mastra decline or customer
consent → booking grant/mutation → persisted outcome → SSE reconciliation`.

This path has several valid conflict states and partial side effects. It needs an explicit state
transition error union and tests proving which writes remain committed after downstream failure.

## 5. Boundary and codec map

| Boundary                                          | Direction/trust                                         | Current wire                                                                | Proposed Result/codec decision                                                                                                                                                                                             | Public mapping and safety                                                                 |
| ------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| CRM browser/server ↔ Adonis                       | Application-owned but browser input is untrusted        | Tuyau `data` success wrapper plus assorted error bodies; raw JSON for Inbox | Retain HTTP success/status semantics, validate structured failures, and convert to in-process Results in the client. A Result codec is intentionally not claimed because no Result envelope crosses this boundary.         | Stable error `code`, safe `message`, `retryable`, selected field issues; no causes/stacks |
| Demo browser ↔ Adonis                             | Public browser input, same-origin cookie                | Plain success/error JSON and native SSE                                     | Retain native HTTP/SSE initially; validate known payload/chunk schemas and convert to Result in client. No outer stream Result envelope.                                                                                   | Conversation-safe codes/messages only                                                     |
| Adonis ↔ Mastra                                   | Private service but network payload is untrusted        | Mastra JSON and native SSE                                                  | Mastra protocol is externally owned, so no custom Result envelope. Use named schemas per endpoint and typed adapter Results.                                                                                               | Redact booking capability and response detail; map upstream status safely                 |
| Mastra booking tool ↔ Adonis internal booking API | Both producer and consumer owned and versioned together | Plain JSON success or structured `{ error: { code, message, retryable } }`  | Retain HTTP status semantics and validate success/error payloads with Zod at the agent receiver. No Result instance is serialized, so `Result.codec` would add a second transport protocol without improving the boundary. | Error codes and safe booking/status facts; never capability or raw cause                  |
| Adonis ↔ SQLite/Lucid                             | Trusted process, operational external store             | ORM values/exceptions                                                       | No serialized Result envelope. Focused actions wrap documented operational failures as Results; domain policy remains separate.                                                                                            | Causes stay server-side and redacted                                                      |
| Mastra ↔ Postgres/DuckDB/filesystem               | Trusted process, operational external stores            | SDK-specific values/exceptions                                              | No Result envelope unless SDK data persists one. Map documented outages at supervisor/capability boundaries; startup invariants remain defects.                                                                            | Store and operation only; no connection strings                                           |
| `InboxAttentionItem.contextJson` ↔ model/action   | Persisted input can be stale or corrupt                 | Unvalidated JSON object                                                     | Named Standard Schema for stored context. No Result codec unless the stored format becomes a Result envelope; parsing returns a typed Result.                                                                              | Never silently replace invalid data with `{}`                                             |
| Inbox EventSource                                 | Server → browser, reconnectable/untrusted               | `inbox.changed` JSON                                                        | Native event schema; malformed optional event triggers full reconciliation. No Result envelope.                                                                                                                            | Conversation ID only                                                                      |
| Mastra response stream                            | Mastra → Adonis → browser                               | Native SSE chunks                                                           | Preserve native stream. Validate known chunks at consumers and model terminal failure as typed Result from the stream consumer.                                                                                            | Do not log raw chunks by default                                                          |
| Encrypted booking capability                      | Adonis → Mastra → Adonis                                | Opaque bearer token                                                         | Not a Result envelope. Decrypt/validate to a typed authorization Result at receiver.                                                                                                                                       | Never serialize decrypted contents or token in errors/telemetry                           |
| Environment/process                               | Deployment → runtime                                    | Environment strings and startup exceptions                                  | Framework schema and loud process failure; no Result envelope                                                                                                                                                              | Variable names/remediation only                                                           |
| Browser localStorage                              | Browser-local, failure is optional                      | Numeric widths                                                              | Keep best-effort fallback; no Result unless observable failure becomes a product requirement                                                                                                                               | No telemetry payload needed                                                               |

## 6. Target error and Panic model

- Each known recoverable condition receives a `TaggedError` owned beside its action or adapter.
- Tags describe the failed operation or domain condition, not `FetchError`, `DatabaseError`, or
  another dependency class.
- Errors carry safe structured identifiers, operation/retry facts, a precise internal message, and
  the original cause where applicable. They never carry tokens, credentials, raw personal data,
  SQL, or unredacted upstream bodies.
- Controllers and presentation adapters exhaustively match error unions and create user-safe copy.
- `Panic` is reserved for impossible state, invalid internal configuration, violated callback or
  schema contracts, and unsafe assertions. Broad catches must not convert it to a generic Err or 502.
- Temporary `UnhandledException` is allowed only for unresolved dependency contracts and is logged
  in this document until classified.
- `unwrap()` is limited to an explicit assertion that Err would itself prove a defect.

## 7. Internal and user-facing mappings

| Error family                  | Internal facts                                            | User/interface behavior                                                        |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Validation/auth               | Field issues, resource/scope, no secret value             | Correct input, sign in, or forbidden response                                  |
| Booking policy                | Booking ID, state, expected/proposed times, conflict kind | Specific 400/404/409 response; booking remains unchanged                       |
| Store unavailable             | Store operation, safe IDs, redacted cause, retryability   | 503/retry copy and explicit statement when no change was committed             |
| Mastra unavailable/rejected   | Endpoint operation, timeout/status, redacted cause        | 502/503 availability copy; retry or reconcile                                  |
| Invalid wire/persistence data | Contract/schema name and issues, safe identifier          | Fail closed; owner/customer gets a review/retry message, not fabricated state  |
| Optional title/telemetry      | Conversation ID and capability failure                    | Primary chat succeeds; log/metric only                                         |
| Defect/Panic                  | Invariant, observed safe state, operation, cause          | Outer error boundary and telemetry; no conversion into ordinary domain failure |

## 8. Ranked vertical migration slices

1. **Booking reschedule authority and mutation.** Highest safety value and best bounded proof. It
   covers tagged domain errors, grant policy, transaction failure, exhaustive HTTP mapping, a
   validated cross-process error contract, the agent adapter, and strong functional tests.
2. **Adonis-to-Mastra conversation adapter.** Removes the largest concentration of generic throws
   and broad 502 catches, then makes compensation and optional title behavior explicit.
3. **Attention context and approval state machine.** Eliminates silently corrupt persisted context
   and types the repository's most consequential multi-step partial-failure path.
4. **CRM HTTP client and auth/query adapter.** Replaces status-only `ApiError`, validates public
   errors, and establishes the deliberate Result-to-TanStack bridge.
5. **Customer demo request and stream client.** Types request, SSE, reconciliation, and mutation
   failures without inventing a second streaming protocol.
6. **CRUD/session actions and framework exceptions.** Converts meaningful not-found, credential,
   and store failures while leaving trivial framework-only resource handling conventional.
7. **Agent date, storage, and tool-framework boundaries.** Splits invalid external input from
   internal defects after verifying Mastra and storage SDK contracts.

## 9. Implementation decisions

1. HTTP boundaries retain conventional status codes and versioned JSON payloads. Results remain an
   in-process control-flow model; `Result.codec` is reserved for a future boundary that actually
   serializes a Result envelope.
2. Lucid actions wrap operational query/save/delete/transaction rejection at the smallest useful
   application boundary. Framework validation, authentication, and trivial terminal CRUD 404s stay
   framework-owned.
3. Mastra tool callbacks must reject to report execution failure, so one named Result-to-throw
   adapter remains at that framework edge. TanStack Query uses the same deliberate edge pattern.
4. Native SSE is preserved. Known chunks are validated, terminal stream failures are tagged, and
   optional malformed reconciliation events retain their documented best-effort behavior.
5. Invalid internal configuration and impossible UI/serializer state use `Panic`; recoverable date,
   wire, persistence, domain, and availability failures use tagged errors.

## 10. Migration progress and validation log

- 2026-08-19: Repository-wide audit completed against `better-result` 3.0.1 documentation and the
  local `adopt-better-result` skill.
- `migrate-better-result-3` applicability check: no installed or referenced better-result 2.x API;
  no codemod or v3 source migration required.
- 2026-08-19: Implemented all seven migration slices across Adonis actions/controllers, the Mastra
  adapter and booking tools, persisted attention context, CRM and demo clients, session/CRUD
  actions, date presentation, and defect invariants.
- Boundary policy: structured HTTP contracts are decoded into Results rather than serializing Result
  instances. The only throws left in application-owned production paths are documented framework
  adapters for TanStack Query and Mastra; process entry catches and deliberate browser/SSE fallbacks
  remain conventional.
- Final validation: all four workspace typechecks, repository lint, 48 tests (28 API, 13 agent, 7
  demo), and all four production builds pass. Every changed file passes Prettier; the repository-wide
  Prettier check still reports unrelated pre-existing drift listed in the implementation handoff.
