FROM oven/bun:1.4.0-slim

WORKDIR /workspace

COPY package.json bun.lock bunfig.toml ./
COPY apps/agent/package.json apps/agent/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/demo/package.json apps/demo/package.json
COPY packages/better-sqlite3 packages/better-sqlite3

RUN bun ci

COPY apps/agent apps/agent

ENV NODE_ENV=development \
    PORT=4111

WORKDIR /workspace/apps/agent

EXPOSE 4111

CMD ["bun", "run", "dev"]
