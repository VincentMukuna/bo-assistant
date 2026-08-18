# Oak & Pine Operations

Turborepo monorepo containing:

- `apps/app` — Next.js CRM frontend
- `apps/api` — API server
- `apps/agent` — Independent Mastra business-support agent service
- `apps/demo` — Customer-facing service business demo site

Customers and bookings are persisted with Lucid. The Oak & Pine demo site connects to the Mastra
agent for public support questions and customer-scoped appointment rescheduling; Inbox and Agent
Activity remain demo-backed.

## Local setup

Requires Node.js 24+ and npm 11+.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cd apps/api
node ace generate:key
cd ../..
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with:

- Email: `owner@oakandpine.test`
- Password: `password123`

`npm run dev` starts the CRM frontend on port 3000, the customer demo on port 3100, the API server on port 3333, and Mastra Studio on port 4111. All four reload as you edit their source. Set `ADONIS_URL` when the backend is hosted elsewhere.

## Appointment assistant demo

Open [http://localhost:3100](http://localhost:3100), choose **Start a conversation**, and submit the
prefilled rescheduling request. The demo silently acts as the isolated Alice Morgan seed customer.
Adonis issues a short-lived encrypted booking capability for each turn, so neither the browser nor
the model selects a customer ID.

The request path is:

```text
Oak & Pine chatbot → demo server route → Adonis API → Mastra agent → Adonis booking tools
```

Set `OPENAI_API_KEY` in `apps/agent/.env`. `MASTRA_URL` and `API_URL` default to their local ports;
their examples show how to override them for separate deployments.

## Agent development

The agent runs alongside the app and API through the root Turbo development command.

```bash
npm run dev
```

Open [http://localhost:4111](http://localhost:4111) for Mastra Studio. Changes to agent instructions, scorers, and other Mastra code reload automatically.

The health check is available at [http://localhost:4111/health](http://localhost:4111/health), and the agent accepts requests at `POST /api/agents/business-support-agent/generate`. Press `Ctrl+C` to stop all four development services.

See the [agent quickstart](apps/agent/RUNBOOK.md) for background start, logs, status, and stop commands.

## Checks

```bash
npm run lint
npm run typecheck
npm run test:api
npm run build
```
