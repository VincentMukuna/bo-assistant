# Agent quickstart

Run these commands from the repository root.

The `apps/agent` directory is the source root: `index.ts` assembles the lean chat runtime, while
`evals/mastra.ts` assembles the separate evaluation runtime. `agents/`, `tools/`, `lib/`, `scorers/`,
`evals/`, and `tests/` keep each responsibility directly visible. Internal imports use the `@/`
root alias, and there is no additional `src/mastra` wrapper.

## Fastest loop

```bash
bun run dev
```

This starts Postgres, the app, API, demo, and agent together. Open [http://localhost:4111](http://localhost:4111), edit the agent, and test it in Studio. Source changes reload automatically. Press `Ctrl+C` when you are done.

The chat runtime writes ordinary structured logs and keeps conversation memory in Postgres. It does
not persist traces, metrics, debug spans, or scores, so Studio's observability screens are empty.

Edit the instructions here:

```text
apps/agent/agents/business-support.ts
```

## Run evals

With `OPENAI_API_KEY` in `apps/agent/.env`, run the full eval suite from the repository root:

```bash
bun run evals
```

The command synchronizes a versioned **Business support regression** dataset and starts a persisted
Mastra experiment. Dataset items own their request context, ground truth, expected trajectory, and
per-item tool mocks, so the suite does not need the API server or Postgres. It covers public facts,
unknown pricing, friendly booking dates, 90-day search windows, ambiguous and exact reschedules,
and prompt-injection attempts. Mastra Quick Checks provide the deterministic checks; the
LLM-judged pricing rubric is reported as a quality signal.

Experiment history and scores are stored locally in `apps/agent/.data/evaluations.db`. The explicit
evaluation runtime owns these records; ordinary agent runs do not execute or persist scorers.

To run only the agent and Studio, start its database first:

```bash
bun run agent:db:start
bun run dev:agent
```

## Inspect the database from Hermes

In TablePlus, create a **PostgreSQL** connection with:

```text
Host: 127.0.0.1
Port: 5433
Database: mastra
User: mastra
Password: mastra
```

Enable **Over SSH** and use:

```text
Server: luna
Port: 22
User: vin
```

Use your normal Luna SSH key or SSH config. Postgres listens only on Luna's loopback interface, so the SSH tunnel is required when connecting from Hermes.

## Run in the background

```bash
bun run agent:start
bun run agent:logs
```

Pressing `Ctrl+C` exits the logs while the agent keeps running.

Useful commands:

```bash
bun run agent:status
bun run agent:stop
```
