# syntax=docker/dockerfile:1.7

FROM oven/bun:1.4.0-slim AS dependencies

WORKDIR /workspace

COPY package.json bun.lock bunfig.toml ./
COPY apps/agent/package.json apps/agent/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/demo/package.json apps/demo/package.json
COPY packages/better-sqlite3 packages/better-sqlite3

RUN --mount=type=cache,id=bo-assistant-bun,target=/root/.bun/install/cache,sharing=locked bun ci


FROM dependencies AS api-builder

ARG ADONIS_URL=http://api:3333

ENV ADONIS_URL=${ADONIS_URL}

COPY apps/api ./apps/api

RUN bun run --filter api build


FROM api-builder AS agent-builder

COPY apps/agent ./apps/agent

RUN bun run --filter agent build


FROM agent-builder AS app-builder

ARG ADONIS_URL=http://api:3333

ENV ADONIS_URL=${ADONIS_URL} \
    NEXT_TELEMETRY_DISABLED=1

COPY apps/app ./apps/app

RUN --mount=type=cache,id=bo-assistant-next-app,target=/workspace/apps/app/.next/cache,sharing=locked \
    bun run --filter app build


FROM app-builder AS demo-builder

ARG ADONIS_URL=http://api:3333

ENV ADONIS_URL=${ADONIS_URL} \
    NEXT_TELEMETRY_DISABLED=1

COPY apps/demo ./apps/demo

RUN --mount=type=cache,id=bo-assistant-next-demo,target=/workspace/apps/demo/.next/cache,sharing=locked \
    bun run --filter demo build


FROM oven/bun:1.4.0-slim AS api-dependencies

WORKDIR /workspace

COPY package.json bun.lock bunfig.toml ./
COPY apps/agent/package.json apps/agent/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/demo/package.json apps/demo/package.json
COPY packages/better-sqlite3 packages/better-sqlite3

RUN --mount=type=cache,id=bo-assistant-bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --production --filter api


FROM oven/bun:1.4.0-slim AS api

ENV NODE_ENV=production

WORKDIR /workspace

COPY --from=api-dependencies /workspace/node_modules ./node_modules
COPY --from=api-dependencies /workspace/packages ./packages
COPY --from=api-builder /workspace/apps/api/build ./apps/api

WORKDIR /workspace/apps/api

EXPOSE 3333

CMD ["sh", "-c", "bun run ace.js migration:run --force && bun run ace.js db:seed && exec bun run bin/server.js"]


FROM oven/bun:1.4.0-slim AS agent

ENV NODE_ENV=production \
    PORT=4111

WORKDIR /app

COPY --from=agent-builder /workspace/apps/agent/.mastra/output ./

EXPOSE 4111

CMD ["bun", "run", "index.mjs"]


FROM oven/bun:1.4.0-slim AS app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

COPY --from=app-builder /workspace/apps/app/.next/standalone ./
COPY --from=app-builder /workspace/apps/app/public ./apps/app/public
COPY --from=app-builder /workspace/apps/app/.next/static ./apps/app/.next/static

WORKDIR /app/apps/app

EXPOSE 3000

CMD ["bun", "run", "server.js"]


FROM oven/bun:1.4.0-slim AS demo

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3100

WORKDIR /app

COPY --from=demo-builder /workspace/apps/demo/.next/standalone ./
COPY --from=demo-builder /workspace/apps/demo/.next/static ./apps/demo/.next/static

WORKDIR /app/apps/demo

EXPOSE 3100

CMD ["bun", "run", "server.js"]
