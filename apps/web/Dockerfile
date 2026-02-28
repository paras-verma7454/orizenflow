FROM oven/bun:latest AS base

FROM base AS prepare
WORKDIR /app
RUN bun install --global turbo
COPY . .
RUN turbo prune @web/next --docker

FROM base AS builder
WORKDIR /app
COPY --from=prepare /app/.env .
COPY --from=prepare /app/.github/ ./.github/
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/bun.lock .
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=prepare /app/out/full/ .
ENV NODE_ENV=production
RUN bun run build

FROM base AS runner
WORKDIR /app
COPY --from=builder --chown=bun:bun /app/node_modules/ ./node_modules/
COPY --from=builder --chown=bun:bun /app/apps/web/ ./apps/web/
COPY --from=builder --chown=bun:bun /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder --chown=bun:bun /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=bun:bun /app/packages/ ./packages/

RUN mkdir -p apps/web/.next && chown -R bun:bun apps/web/.next

USER bun
WORKDIR /app/apps/web
CMD ["bun", "run", "start"]
EXPOSE 3000