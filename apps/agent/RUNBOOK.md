# Agent quickstart

Run these commands from the repository root.

## Fastest loop

```bash
npm run dev
```

This starts Postgres, the app, API, demo, and agent together. Open [http://localhost:4111](http://localhost:4111), edit the agent, and test it in Studio. Source changes reload automatically. Press `Ctrl+C` when you are done.

Studio records local traces, model and tool spans, token and latency metrics, scores, and debug-level logs. Use the **Observability**, **Metrics**, and **Logs** screens to inspect agent runs. The telemetry is kept locally in `apps/agent/.data/observability.duckdb`; Postgres remains the agent's regular storage. Booking capabilities are redacted from stored traces.

Edit the instructions here:

```text
apps/agent/src/mastra/agents/business-support-agent.ts
```

To run only the agent and Studio, start its database first:

```bash
npm run agent:db:start
npm run dev:agent
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
npm run agent:start
npm run agent:logs
```

Pressing `Ctrl+C` exits the logs while the agent keeps running.

Useful commands:

```bash
npm run agent:status
npm run agent:stop
```
