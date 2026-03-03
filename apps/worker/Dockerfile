FROM oven/bun:latest AS base

FROM base AS prepare
WORKDIR /app
RUN bun install --global turbo
COPY . .
RUN turbo prune @worker/bullmq --docker

FROM mcr.microsoft.com/playwright:v1.58.2-noble AS builder
ENV BUN_INSTALL=/root/.bun
ENV PATH=${BUN_INSTALL}/bin:${PATH}

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates unzip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/bun.lock .

RUN bun install --frozen-lockfile --ignore-scripts

COPY --from=prepare /app/out/full/ .
# Create minimal .env for build time (actual env variables come from docker compose)
RUN echo "# Build time env" > .env

ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
RUN bun run build --filter=@packages/env --filter=@packages/db --filter=@packages/queue --filter=@worker/bullmq

FROM mcr.microsoft.com/playwright:v1.58.2-noble
ENV BUN_INSTALL=/root/.bun
ENV PATH=${BUN_INSTALL}/bin:${PATH}

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates unzip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app
COPY --from=builder --chown=root:root /app/node_modules/ ./node_modules/
COPY --from=builder --chown=root:root /app/apps/worker/ ./apps/worker/
COPY --from=builder --chown=root:root /app/packages/ ./packages/

# Verify dist folder exists
RUN ls -la apps/worker/dist/ || echo "Warning: dist folder not found"

CMD ["bun", "apps/worker/dist/index.mjs"]