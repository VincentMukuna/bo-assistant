# Agent quickstart

Run these commands from the repository root.

## Fastest loop

```bash
npm run dev
```

This starts the app, API, and agent together. Open [http://localhost:4111](http://localhost:4111), edit the agent, and test it in Studio. Source changes reload automatically. Press `Ctrl+C` when you are done.

Edit the instructions here:

```text
apps/agent/src/mastra/agents/business-support-agent.ts
```

To run only the agent and Studio:

```bash
npm run dev:agent
```

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
