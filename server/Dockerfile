FROM node:22-alpine
WORKDIR /app
RUN corepack enable && apk add --no-cache openssl
COPY package.json pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile=false
COPY server ./server
RUN pnpm --filter @jumbak/server build && chmod +x server/scripts/start-prod.sh
EXPOSE 4000
CMD ["sh", "server/scripts/start-prod.sh"]
