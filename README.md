# Oak & Pine Operations

Turborepo monorepo containing:

- `apps/app` — Next.js CRM frontend
- `apps/api` — AdonisJS API with Lucid and session authentication

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

## Checks

```bash
npm run lint
npm run typecheck
npm run test:api
npm run build
```
