# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

````js
export default defineConfig([
  # bmad-todo Web (`packages/web`)

  React SPA workspace (Vite + TypeScript).

  ## Local prerequisites

  - Node.js `>= 22.12` (see repo root `.nvmrc`)
  - npm (npm workspaces)

  ## Scripts

  Run these from the repo root:

  ```bash
  npm -w web run dev
  npm -w web run build
  npm -w web run start

  npm -w web run test
  npm -w web run test:ci
  npm -w web run type:check
````

API type generation (from committed OpenAPI):

```bash
npm -w web run build:api-types
```

## Running with Docker

The web workspace ships a multi-stage Dockerfile at `packages/web/Dockerfile`. It builds the Vite SPA and serves it with Nginx, which also reverse-proxies API routes (`/todos`, `/users`) to the API service.

### Prerequisites

- Docker runtime (Colima, Docker Desktop, etc.)
- A running API service reachable from the container (see [packages/api/README.md](../api/README.md#running-with-docker))

### Build the image

From the **repo root** (the build context must be the monorepo root):

```bash
docker build -f packages/web/Dockerfile -t bmad-todo-web .
```

### Run the container

The Nginx config proxies API routes to a host named `api`. When running standalone (without Docker Compose), point to your API using `--add-host`:

```bash
docker run --rm \
  -e API_PORT=3001 \
  -p 8080:80 \
  --add-host api:host-gateway \
  bmad-todo-web
```

> On Linux replace `host-gateway` with `172.17.0.1` (default Docker bridge gateway) or use `--network host`.

The SPA is served on port 80 inside the container (mapped to 8080 above). Verify with:

```bash
curl http://localhost:8080
```

### Environment variables

| Variable   | Required | Default | Notes                                              |
| ---------- | -------- | ------- | -------------------------------------------------- |
| `API_PORT` | yes      | —       | Port the API service listens on (used by Nginx proxy) |

### How the entrypoint works

The `docker-entrypoint.sh` script substitutes `$API_PORT` into the Nginx config template (`nginx.conf.template`) at container startup, then launches Nginx. This keeps the image portable across environments with different API ports.

## E2E tests

The `test:e2e` script is currently a placeholder. When Playwright E2E tests are added, local setup will also require installing Playwright browsers (typically via `npx playwright install`).
