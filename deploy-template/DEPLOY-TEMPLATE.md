⏮️ Back to main [README.md](../README.md)

# Deploy-template Action

## Usage

> [!IMPORTANT]
>
> A Gcore
> [permanent API token](https://gcore.com/docs/account-settings/create-use-or-delete-a-permanent-api-token)
> is required to authorize access to the Gcore API.

```yaml
name: Publish Template

on:
  workflow_dispatch:

jobs:
  publish:
    name: publish
    runs-on: ubuntu-latest

    steps:
      - id: deploy-template
        uses: gcore-github-actions/fastedge/deploy-template@v1
        with:
          api_key: ${{ secrets.GCORE_API_TOKEN }}
          wasm_file: 'public/app.wasm'
          template_name: 'my-template'
          short_descr: 'A brief description shown in the template list'
          long_descr: 'A longer description shown on the template detail page'
          params: |
            [
              {
                "name": "ORIGIN_URL",
                "data_type": "string",
                "descr": "The upstream origin URL",
                "mandatory": true,
                "metadata": ""
              }
            ]

      - name: Use output
        run: |
          echo "template_id: ${{ steps.deploy-template.outputs.template_id }}"
          echo "binary_id: ${{ steps.deploy-template.outputs.binary_id }}"
```

> [!NOTE]
>
> This action runs using Node 20. If you are using self-hosted GitHub Actions
> runners, you must use a [runner version](https://github.com/actions/runner)
> that supports this version or newer.

## Inputs

- `api_key` - (required) A permanent API token that will authenticate the GitHub
  action to the Gcore API.
- `wasm_file` - (required) The filepath of the built WASM binary.
- `template_name` - (required) The unique name of the template.

- `template_id` - (optional) The unique ID of an existing template. When
  provided, the action performs a direct lookup by ID instead of searching by
  name. This allows renaming a template via `template_name`.
- `short_descr` - (optional) A short description shown in template listings.
- `long_descr` - (optional) A longer description shown on the template detail
  page.
- `params` - (optional) A JSON array of parameter definitions that users fill in
  when creating an app from this template. Defaults to `[]`. See
  [Params schema](#params-schema) below.
- `api_url` - (optional) Defaults to `https://api.gcore.com`.

## Outputs

- `template_id`: The unique ID of the template (created or updated).
- `binary_id`: The unique ID of the uploaded WASM binary attached to the
  template.

## Params schema

The `params` input is a JSON array of objects. Each object defines one parameter
that a user must (or may) supply when creating a FastEdge app from the template.

| Field       | Type    | Required | Description                                             |
| ----------- | ------- | -------- | ------------------------------------------------------- |
| `name`      | string  | yes      | Environment variable name, e.g. `ORIGIN_URL`            |
| `data_type` | string  | yes      | One of `string`, `number`, `boolean`, `enum`, `json`    |
| `descr`     | string  | yes      | Human-readable label shown to the user                  |
| `mandatory` | boolean | yes      | Whether the user must supply a value                    |
| `metadata`  | string  | yes      | A **JSON-encoded string** with type-specific extra data |

### metadata by data_type

**`string` / `number` / `boolean`** — use an empty string or a default:

```json
{ "default_value": "https://example.com" }
```

**`enum`** — list of options and a default:

```json
{
  "enum_values": [
    { "value": "dark", "label": "Dark" },
    { "value": "light", "label": "Light" }
  ],
  "default_value": "dark"
}
```

**`json`** — a JSON-encoded default value (the default itself is also
JSON-encoded inside the string):

```json
{ "default_value": "{\"key\":\"value\"}" }
```

> [!IMPORTANT]
>
> `metadata` must always be a **string**, never a raw JSON object. The content
> shown above should be serialised with `JSON.stringify` before placing it in
> the array.

### Full params example

```yaml
params: |
  [
    {
      "name": "ORIGIN_URL",
      "data_type": "string",
      "descr": "Upstream origin URL",
      "mandatory": true,
      "metadata": "{\"default_value\":\"https://example.com\"}"
    },
    {
      "name": "THEME",
      "data_type": "enum",
      "descr": "UI theme",
      "mandatory": false,
      "metadata": "{\"enum_values\":[{\"value\":\"dark\",\"label\":\"Dark\"},{\"value\":\"light\",\"label\":\"Light\"}],\"default_value\":\"dark\"}"
    }
  ]
```

## CI/CD Runtime

> [!NOTE]
>
> This action is configured to only make updates when it detects changes.

The action compares the incoming WASM binary checksum against the checksum of
the binary currently attached to the template. It also compares template
metadata fields (`name`, `short_descr`, `long_descr`, `params`). No API calls
are made to update the template unless something has actually changed.

The same caveats that apply to `deploy-app` apply here: rebuilding a WASM binary
from source produces a new checksum even if the code is identical. Use the same
strategies to avoid unnecessary updates:

**Solution 1** — Trigger the workflow only on changes to the relevant source
path using the `paths` filter.

**Solution 2** — Build release artifacts containing the compiled WASM binary and
reference those stable artifacts in the workflow rather than rebuilding on every
run.

> You can see examples of both strategies in
> [FastEdge-examples](https://github.com/G-Core/FastEdge-examples/blob/main/github-examples/README.md)

## Development

1. Copy and rename `.env.example.deploy-template` >> `.env.deploy-template`.
2. Edit `.env.deploy-template` with your `API_KEY` and other values.
3. Run `npm run local-action:template` after any change to test it locally.

> [!NOTE]
>
> Remember to call `npm run all` before committing your changes and pushing them
> to remote.

## Releasing

1. Run the `./script/release` script to create and push a new tag.
2. A workflow will run and generate a new draft release for you based on the tag
   you entered.
3. Open the
   [Releases](https://github.com/gcore-github-actions/fastedge/releases) page
   and go to the draft release.
4. Make sure the `Publish this release to the GitHub Marketplace` checkbox is
   checked and the changelog is correct.
5. Publish the new release.
6. Move the major version tag (e.g. `v1`) to the latest patch release.
