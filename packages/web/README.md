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

## E2E tests

The `test:e2e` script is currently a placeholder. When Playwright E2E tests are added, local setup will also require installing Playwright browsers (typically via `npx playwright install`).
