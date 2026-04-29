FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS build

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate
RUN pnpm --filter @carloi-v4/api build

FROM base AS runtime

ENV NODE_ENV=production

COPY --from=build /app /app

RUN pnpm prune --prod && mkdir -p /app/uploads /app/logs && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["sh", "-c", "pnpm prisma:migrate && pnpm --filter @carloi-v4/api start:prod"]
