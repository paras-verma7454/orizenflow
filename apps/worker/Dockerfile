FROM mcr.microsoft.com/playwright:v1.58.2-noble

ENV BUN_INSTALL=/root/.bun
ENV PATH=${BUN_INSTALL}/bin:${PATH}

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates unzip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

RUN bun install --ignore-scripts

COPY . .

RUN cd /app/apps/worker && bun run build

CMD ["bun", "--cwd", "apps/worker", "run", "start"]