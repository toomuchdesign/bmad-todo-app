## Deferred from: code review (2026-03-27)

- API binds to `127.0.0.1` by default — fine for local dev, but can be surprising in container/remote environments (consider defaulting to `0.0.0.0` or documenting `HOST`). Location: `src/api/src/server.ts`
- Root workspaces glob is `src/*` — acceptable for now, but may unintentionally treat future `src/<folder>` as a workspace if someone adds a non-package folder. Location: `package.json`
