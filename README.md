# Oak & Pine Operations

Turborepo monorepo containing:

- `apps/app` — Next.js CRM frontend
- `apps/api` — AdonisJS API with Lucid and session authentication
- `apps/agent` — Independent Mastra business-support agent service

Customers and bookings are persisted with Lucid; Inbox and Agent Activity remain demo-backed for the next agentic phase.

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

`npm run dev` starts Next.js on port 3000 and Adonis on port 3333. Set `ADONIS_URL` when the backend is hosted elsewhere.

## Agent development

The agent runs as a separate development service and does not connect to the app or API yet.

```bash
npm run agent:dev
```

Open [http://localhost:4111](http://localhost:4111) for Mastra Studio. The `apps/agent/src` directory is mounted into the container, so changes to agent instructions, scorers, and other Mastra code reload automatically without rebuilding the image.

The health check is available at [http://localhost:4111/health](http://localhost:4111/health), and the agent accepts requests at `POST /api/agents/business-support-agent/generate`. Press `Ctrl+C` to stop the development service.

See the [agent quickstart](apps/agent/RUNBOOK.md) for background start, logs, status, and stop commands.

## Checks

```bash
npm run lint
npm run typecheck
npm run test:api
npm run build
```
