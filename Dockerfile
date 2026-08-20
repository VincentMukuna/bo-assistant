# syntax=docker/dockerfile:1.7

FROM node:24-slim AS dependencies

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ make python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/agent/package.json apps/agent/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/demo/package.json apps/demo/package.json

RUN --mount=type=cache,id=bo-assistant-npm,target=/root/.npm,sharing=locked npm ci


FROM dependencies AS api-builder

ARG ADONIS_URL=http://api:3333

ENV ADONIS_URL=${ADONIS_URL}

COPY turbo.json ./
COPY apps/api ./apps/api

RUN --mount=type=cache,id=bo-assistant-turbo,target=/workspace/.turbo,sharing=locked \
    npm run build -- --filter=api --concurrency=1


FROM dependencies AS agent-builder

COPY turbo.json ./
COPY apps/agent ./apps/agent

RUN --mount=type=cache,id=bo-assistant-turbo,target=/workspace/.turbo,sharing=locked \
    npm run build -- --filter=agent --concurrency=1


FROM dependencies AS app-builder

ARG ADONIS_URL=http://api:3333

ENV ADONIS_URL=${ADONIS_URL} \
    NEXT_TELEMETRY_DISABLED=1

COPY turbo.json ./
COPY apps/api ./apps/api
COPY apps/app ./apps/app

RUN --mount=type=cache,id=bo-assistant-turbo,target=/workspace/.turbo,sharing=locked \
    --mount=type=cache,id=bo-assistant-next-app,target=/workspace/apps/app/.next/cache,sharing=locked \
    npm run build -- --filter=app --concurrency=1


FROM dependencies AS demo-builder

ARG ADONIS_URL=http://api:3333

ENV ADONIS_URL=${ADONIS_URL} \
    NEXT_TELEMETRY_DISABLED=1

COPY turbo.json ./
COPY apps/demo ./apps/demo

RUN --mount=type=cache,id=bo-assistant-turbo,target=/workspace/.turbo,sharing=locked \
    --mount=type=cache,id=bo-assistant-next-demo,target=/workspace/apps/demo/.next/cache,sharing=locked \
    npm run build -- --filter=demo --concurrency=1


FROM node:24-slim AS api-dependencies

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ make python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/agent/package.json apps/agent/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/demo/package.json apps/demo/package.json

RUN --mount=type=cache,id=bo-assistant-npm,target=/root/.npm,sharing=locked \
    npm ci --omit=dev --workspace=api


FROM node:24-slim AS api

ENV NODE_ENV=production

WORKDIR /workspace

COPY --from=api-dependencies /workspace/node_modules ./node_modules
COPY --from=api-builder /workspace/apps/api/build ./apps/api

WORKDIR /workspace/apps/api

EXPOSE 3333

CMD ["sh", "-c", "node ace migration:run --force && node ace db:seed && exec node bin/server.js"]


FROM node:24-slim AS agent

ENV NODE_ENV=production \
    PORT=4111

WORKDIR /app

COPY --from=agent-builder /workspace/apps/agent/.mastra/output ./

EXPOSE 4111

CMD ["node", "index.mjs"]


FROM node:24-slim AS app

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

CMD ["node", "server.js"]


FROM node:24-slim AS demo

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3100

WORKDIR /app

COPY --from=demo-builder /workspace/apps/demo/.next/standalone ./
COPY --from=demo-builder /workspace/apps/demo/.next/static ./apps/demo/.next/static

WORKDIR /app/apps/demo

EXPOSE 3100

CMD ["node", "server.js"]
