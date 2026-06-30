# FastEdge GitHub Actions

## Governance (REQUIRED)

Read `AGENTS.md` for company-wide agent rules. These are mandatory and override
any conflicting behavior. Key rules: never go beyond the assigned task, never
change code that was not asked to change, never "improve" or "optimize" without
a clear request, always distinguish observations from action requests.

---

## Project Goal

GitHub Actions for deploying **Gcore FastEdge** Wasm applications and secrets in
CI/CD workflows. Published to the GitHub Marketplace. Two composite actions ship
from this repository:

- **`deploy-app`** — uploads a Wasm binary and creates/updates a FastEdge HTTP
  or Proxy-WASM app
- **`secrets`** — creates/updates a named secret in the FastEdge secret store

Both actions are idempotent: they detect existing resources by name and only
push changes when state differs.

## Discovery

**Read `context/INDEX.md`** — it is the discovery hub for all reference material
in this repository.

## Repository Structure

```
src/
  api-utils/         # FastEdgeClient — wraps Gcore REST API (apps, binaries, secrets)
    apps/            # App CRUD operations
    binaries/        # WASM binary upload + retrieval
    secrets/         # Secret CRUD operations
    index.ts         # FastEdgeClient class + re-exports
    types.ts         # Shared types (ApiConfig, etc.)
  deploy-app/
    main.ts          # Action entry point — reads inputs, calls orchestration
    index.ts         # Orchestration: upload binary → create/update app
    changes.ts       # Change detection: compare desired state vs live state
    utils.ts         # Input parsing helpers (env vars, headers, secrets dict)
  secrets/
    main.ts          # Action entry point
    index.ts         # Orchestration: create/update secret
    utils.ts         # secret_slots helpers

deploy-app/          # action.yml for the deploy-app composite action
secrets/             # action.yml for the secrets composite action
dist/                # Bundled JS (generated — do not edit directly)
__tests__/           # Jest unit tests (mirrors src/ structure)
__fixtures__/        # Shared test fixtures
```

## Key Constraints

- **`dist/` is generated** — always run `npm run all` before committing; a CI
  workflow (`check-dist.yaml`) fails if `dist/` is stale
- **Node 20** required — both actions declare `node20` as the runner
- **Change detection is intentional** — the action skips API calls if the
  desired state matches live state; do not remove this logic without
  understanding the CI/CD implications (see `deploy-app/DEPLOY-APP.md` → "CI/CD
  Runtime")
- **`@actions/core`** for all logging — do not use `console.log`/`console.error`
- **pnpm** is the package manager — use `pnpm` not `npm` or `yarn` when running
  scripts locally

## Dev Workflow

```bash
pnpm install                       # install deps
npm run test                       # run Jest tests
npm run local-action:app           # test deploy-app action locally (needs .env.deploy-app)
npm run local-action:secret        # test secrets action locally (needs .env.secrets)
npm run all                        # format + lint + test + coverage + bundle (run before committing)
```

Copy `.env.example.deploy-app` → `.env.deploy-app` and `.env.example.secrets` →
`.env.secrets` before local testing.

## Gcore API

Base URL: `https://api.gcore.com` (overridable via `api_url` input) Auth:
`Bearer <GCORE_API_TOKEN>` — permanent API token, never a short-lived one Docs:
see FastEdge API docs linked from the action READMEs
