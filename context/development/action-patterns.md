# Action Patterns

How every action in this repo is built. Follow these patterns exactly when
adding a new action.

## File structure per action

Every action needs these files (using `deploy-template` as a hypothetical
example):

```
deploy-template/
└── action.yml                        # GitHub Actions metadata — inputs, outputs, runs

src/deploy-template/
├── main.ts                           # Entry point: reads @actions/core inputs, calls run()
├── index.ts                          # Orchestration: business logic, API calls, setOutput()
├── changes.ts                        # Change detection: compare desired state vs live state
└── utils.ts                          # Input parsing helpers

__tests__/deploy-template/
├── main.test.ts
├── index.test.ts
├── changes.test.ts
└── utils.test.ts

rollup-deploy-template.config.ts      # Rollup bundle config (copy of existing, change input/output paths)
```

### `action.yml` skeleton

```yaml
name: 'FastEdge Deploy Template Action'
description: 'Creates or updates a FastEdge template with a new WASM binary'
author: 'Gcore'

branding:
  icon: upload-cloud
  color: orange

inputs:
  api_key:
    description: 'Gcore permanent API token'
    required: true
  api_url:
    description: 'Gcore API base URL'
    required: false
    default: 'https://api.gcore.com'
  # ... action-specific inputs

outputs:
  template_id:
    description: 'ID of the created or updated template'

runs:
  using: node20
  main: '../dist/deploy-template/index.js'
```

### `main.ts` pattern

```typescript
import * as core from '@actions/core'
import { run } from './index.js'

run()
```

### `index.ts` (orchestration) pattern

```typescript
import * as core from '@actions/core'
import { FastEdgeClient } from '../api-utils/index.js'

export async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('api_key', { required: true })
    const apiUrl = core.getInput('api_url') || 'https://api.gcore.com'

    const client = new FastEdgeClient(apiKey, apiUrl)

    // ... fetch existing resource, detect changes, create or update
    // Always call core.setOutput() for every declared output
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
```

## Change detection

Both existing actions skip API mutations if the desired state already matches
live state. This is intentional — without it, every CI run would re-push
binaries and force global edge replication even when nothing changed (see
`deploy-app/DEPLOY-APP.md` → "CI/CD Runtime").

Pattern in `changes.ts`:

1. Fetch the live resource (by name or ID)
2. Build a "desired state" object from action inputs
3. Deep-compare the two — if equal, log "no changes" and return early
4. Otherwise call create or update

See `src/deploy-app/changes.ts` for the reference implementation.

## FastEdgeClient extension

When adding a new API resource group, extend `FastEdgeClient` in
`src/api-utils/index.ts`:

```typescript
// 1. Add a new subdirectory: src/api-utils/templates/
//    ├── index.ts   — exported async functions (getTemplate, createTemplate, etc.)
//    └── types.ts   — request/response interfaces

// 2. Import at the top of src/api-utils/index.ts
import * as templates from './templates/index.js'

// 3. Add a getter on FastEdgeClient
get templates() {
  return {
    get:      (id: number | string) => templates.getTemplate(this.apiConfig, id),
    getByName:(name: string)        => templates.getTemplateByName(this.apiConfig, name),
    create:   (resource: Parameters<typeof templates.createTemplate>[1]) =>
                templates.createTemplate(this.apiConfig, resource),
    update:   (resource: Parameters<typeof templates.updateTemplate>[1]) =>
                templates.updateTemplate(this.apiConfig, resource),
  }
}
```

Model each function on the existing `src/api-utils/apps/` or
`src/api-utils/secrets/` implementations.

## Rollup config

Copy an existing config and change the `input` and `output.dir`:

```typescript
// rollup-deploy-template.config.ts
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { type RollupOptions } from 'rollup'

const config: RollupOptions = {
  input: 'src/deploy-template/main.ts',
  output: { dir: 'dist/deploy-template', format: 'es', sourcemap: true },
  plugins: [nodeResolve({ preferBuiltins: true }), commonjs(), typescript()]
}

export default config
```

Then add to `package.json`:

```json
"package:deploy-template": "npx rollup --config rollup-deploy-template.config.ts --configPlugin @rollup/plugin-typescript",
"package": "npm-run-all -p package:app package:secret package:deploy-template"
```

## Testing conventions

- Tests live in `__tests__/<action>/`, mirroring `src/<action>/`
- Fixtures (shared mock data, mock fetch responses) go in `__fixtures__/`
- Use `jest.spyOn` / `jest.mock` — do not call real API endpoints in unit tests
- Mock `@actions/core` inputs via `jest.spyOn(core, 'getInput')`
- Cover: happy path, resource-already-exists (update path), no-changes (skip
  path), API error

## Key rules

- Use `@actions/core` for all logging (`core.info`, `core.warning`,
  `core.setFailed`) — never `console`
- All inputs read via `core.getInput()`, all outputs set via `core.setOutput()`
- Run `npm run all` before every commit — CI fails if `dist/` is stale
- The `dist/` directory is committed and must be kept in sync with `src/`
