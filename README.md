# Oak & Pine Operations

Bun workspace monorepo containing:

- `apps/app` — Business Workspace
- `apps/api` — API server
- `apps/agent` — business-support agent
- `apps/demo` — Customer-facing service business demo site

Customers and bookings are persisted with Lucid. The Oak & Pine demo site connects to the Mastra
agent for public support questions and customer-scoped appointment rescheduling; Inbox and Agent
Activity remain demo-backed.

Lucid keeps its Knex-compatible `better-sqlite3` boundary, backed in this workspace by Bun's native
`bun:sqlite` driver instead of a Node N-API addon.

## Local setup

Requires Bun 1.4.x.

```bash
bun install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/agent/.env.example apps/agent/.env
bun run key:generate
bun run db:migrate
bun run db:seed
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with:

- Email: `kim@oakandpine.test`
- Password: `password123`

`bun run dev` starts the CRM frontend on port 3000, the customer demo on port 3100, the API server on port 3333, and Mastra Studio on port 4111. All four reload as you edit their source. Set `ADONIS_URL` when the backend is hosted elsewhere.

## Appointment assistant demo

Open [http://localhost:3100](http://localhost:3100), choose **Start a conversation**, and submit the
prefilled rescheduling request. The demo silently acts as the isolated Alice Morgan seed customer.
Adonis issues a short-lived encrypted booking capability for each turn, so neither the browser nor
the model selects a customer ID.

The request path is:

```text
Oak & Pine chatbot → demo server route → Adonis API → Mastra agent → Adonis booking tools
```

Set `OPENAI_API_KEY` in `apps/agent/.env`. The API development server listens on all host
interfaces so the containerized agent can reach it through `host.docker.internal`; its customer
routes remain origin-checked. `MASTRA_URL` and `API_URL` default to their local ports, and their
examples show how to override them for separate deployments.

## Agent development

The agent runs alongside the app and API through Bun's root workspace development command.

```bash
bun run dev
```

Open [http://localhost:4111](http://localhost:4111) for Mastra Studio. Changes to agent instructions, scorers, and other Mastra code reload automatically.

The health check is available at [http://localhost:4111/health](http://localhost:4111/health), and the agent accepts requests at `POST /api/agents/business-support-agent/generate`. Press `Ctrl+C` to stop all four development services.

See the [agent quickstart](apps/agent/RUNBOOK.md) for background start, logs, status, and stop commands.

## Checks

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```
