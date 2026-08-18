FROM node:24-slim

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/agent/package.json apps/agent/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/app/package.json apps/app/package.json

RUN npm ci --workspace=agent

COPY apps/agent apps/agent

ENV NODE_ENV=development \
    PORT=4111

WORKDIR /workspace/apps/agent

EXPOSE 4111

CMD ["npm", "run", "dev"]
