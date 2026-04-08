# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace manifests and install all deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN npm ci

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

# Build shared then api
RUN npm run build -w shared
RUN npm run build -w api

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

# Default host for container (must be 0.0.0.0 to accept external connections)
ENV API_HOST=0.0.0.0

# Copy workspace manifests for prod install
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN npm ci --omit=dev

# Copy compiled output and migrations
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY packages/api/drizzle ./packages/api/drizzle

WORKDIR /app/packages/api

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
