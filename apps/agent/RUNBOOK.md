# Agent quickstart

Run these commands from the repository root.

## Fastest loop

```bash
npm run agent:dev
```

Open [http://localhost:4111](http://localhost:4111), edit the agent, and test it in Studio. Source changes reload automatically. Press `Ctrl+C` when you are done.

Edit the instructions here:

```text
apps/agent/src/mastra/agents/business-support-agent.ts
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
