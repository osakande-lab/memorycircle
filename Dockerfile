FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV APP_MODE=supabase
EXPOSE 3001
# Bind policy in index.js defaults to loopback. Set HOST=0.0.0.0 for containers.
ENV HOST=0.0.0.0
CMD ["node","--env-file-if-exists=.env","server/index.js"]
