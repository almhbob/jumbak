FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile=false
COPY server ./server
RUN pnpm --filter @jumbak/server build
EXPOSE 4000
CMD ["pnpm", "--filter", "@jumbak/server", "start"]
