# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace manifests for layer-cache-friendly install
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Work around npm/cli#4828: npm ci does not resolve cross-platform optional deps
# for native bindings (rolldown, lightningcss). Clean slate install resolves them
# for the container platform. --legacy-peer-deps handles TS6/openapi-typescript peer conflict.
RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

# Build shared (web imports from it via workspace resolution)
RUN npm run build -w shared

# Build the Vite SPA
RUN npm run build -w web

# ---- runtime ----
FROM nginx:alpine AS runtime

# Copy built SPA assets
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Copy Nginx config template and entrypoint
COPY packages/web/nginx.conf /etc/nginx/conf.d/nginx.conf.template
COPY packages/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
