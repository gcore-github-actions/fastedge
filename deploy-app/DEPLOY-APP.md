⏮️ Back to main [README.md](../README.md)

# Deploy-app Action

## Usage

> [!IMPORTANT]
>
> A Gcore
> [permanent API token](https://gcore.com/docs/account-settings/create-use-or-delete-a-permanent-api-token)
> is required to authorize access to the Gcore API.

```yaml
name: Deploy

on:
  workflow_dispatch:

jobs:
  deploy:
    name: deploy
    runs-on: ubuntu-latest

    steps:
      - id: deploy-app
        uses: gcore-github-actions/fastedge/deploy-app@v1
        with:
          api_key: ${{ secrets.GCORE_API_TOKEN }}
          wasm_file: 'public/test.wasm'
          app_name: 'my-new-application'
          comment: 'Creates a basic application from the provided wasm binary'
          rsp_headers: '{ "Content-Type": "application/json" }'
          env: '{ "environment": "production" }'
          secrets: '{ "database_password": 152 }'

      - name: Use output
        run: |
          echo "binary_id: ${{ steps.deploy-app.outputs.binary_id }}"
          echo "app_id: ${{ steps.deploy-app.outputs.app_id }}"
```

> [!NOTE]
>
> This action runs using Node 20. If you are using self-hosted GitHub Actions
> runners, you must use a [runner version](https://github.com/actions/runner)
> that supports this version or newer.

## Inputs

- `api_key` - (required) A permanent API token that will authenticate the GitHub
  action to Gcore API.
- `wasm_file` - (required) The filepath of the built binary. ( Please read
  "CI/CD Runtime" notes below on this )
- `app_name` - (required) The unique name of the application deployed.

- `app_id` - (optional) The unique ID of the application, when using this you
  are able to edit the name via the action.
- `comment` - (optional) The description of the application.
- `rsp_headers` - (optional) A JSON string representing a dictionary of
  "Response Headers". ( Alternatively you can provide string pairs )
- `env` - (optional) A JSON string representing a dictionary of "Environment
  Variables". ( Alternatively you can provide string pairs )
- `secrets` - (optional) A JSON string representing a dictionary of "Secrets". (
  Alternatively you can provide string pairs )
- `api_url` - (optional) Defaults to https://api.gcore.com

## Outputs

- `binary_id`: The unique ID allocated to the uploaded binary.
- `app_id`: The unique ID allocated to the application.

## Alternate Usage with Strings

```yaml
name: Deploy

on:
  workflow_dispatch:

jobs:
  deploy:
    name: deploy
    runs-on: ubuntu-latest

    steps:
      - id: deploy-app
        uses: gcore-github-actions/fastedge/deploy-app@v1
        with:
          api_key: ${{ secrets.GCORE_API_TOKEN }}
          wasm_file: 'public/test.wasm'
          app_name: 'my-new-application'
          comment: 'Creates a basic application from the provided wasm binary'
          rsp_headers: |
            "Content-Type"="application/json"
          env: |
            environment=production
            "my-variable"='testing'
          secrets: |
            database_password=152

      - name: Use output
        run: |
          echo "binary_id: ${{ steps.deploy-app.outputs.binary_id }}"
          echo "app_id: ${{ steps.deploy-app.outputs.app_id }}"
```

## CI/CD Runtime

> [!NOTE]
>
> This action is configured to only make updates if it detects changes.

When building Wasm binaries within your workflows, each time you create a new
Wasm the calculated checksum of this binary will change.

This will inadvertently make the action upload a new binary ( i.e. it thinks it
is different, even if the code has not changed).

It will also update the application based on this binary. This is not a
preferred workflow scenario, as it means each time the action runs it will alter
binaries and timestamps within your application. As well as force the
application to be replicated across the entire edge network.

##### Solution 1:

Only ever manage a single application per GitHub workflow. Taking advantage of
the `paths` feature. This means the workflow will only ever run if actual code
changes to the specific application have been made.

##### Solution 2:

Create release artifacts that contain your built Wasm binaries. This way you
only update binaries if code has changed and keep referencing the old Wasm
binaries when there are no changes. This way the binary checksums will be
calculated correctly.

> You can see examples of how both these solutions are accomplished in
> [FastEdge-examples](https://github.com/G-Core/FastEdge-examples/blob/main/github-examples/README.md)

## Development

1. Copy and rename `.env.example.deploy-app` >> `.env.deploy-app`.
2. Edit this`.env.deploy-app` file with your `API_KEY` and other values you wish
   to use.
3. Run `npm run local-action:app` after any change to test it using the
   `test-local-action` workflow.

> [!NOTE]
>
> Remember to call `npm run all` before committing your changes and pushing them
> to remote.

## Releasing

1. Run the `./script/release` script to create and push a new tag.
1. A workflow will run and generate a new draft release for you based on the tag
   you entered.
1. Open the
   [Releases](https://github.com/gcore-github-actions/deploy-container/releases)
   page and go to the draft release.
1. Make sure the `Publish this release to the GitHub Marketplace` checkbox is
   checked and changelog is correct.
1. Publish the new release.
1. Move the major version tag (e.g. v1) to the latest patch release.
