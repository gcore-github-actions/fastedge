# FastEdge Templates API

Source: `GET /fastedge/v1/template` — verified against live API 2026-06-26.

## Endpoints

| Operation       | Method + Path                       | Body             | Response                                     |
| --------------- | ----------------------------------- | ---------------- | -------------------------------------------- |
| List templates  | `GET /fastedge/v1/template`         | —                | `{ count: int, templates: TemplateShort[] }` |
| Get template    | `GET /fastedge/v1/template/{id}`    | —                | `Template`                                   |
| Create template | `POST /fastedge/v1/template`        | `CreateTemplate` | `TemplateShort`                              |
| Update template | `PUT /fastedge/v1/template/{id}`    | `UpdateTemplate` | `TemplateShort`                              |
| Delete template | `DELETE /fastedge/v1/template/{id}` | —                | `204`                                        |

### List query params

| Param       | Type                          | Notes                                      |
| ----------- | ----------------------------- | ------------------------------------------ |
| `api_type`  | `"wasi-http" \| "proxy-wasm"` | Filter by WASM ABI                         |
| `only_mine` | `boolean`                     | `true` returns only caller-owned templates |
| `limit`     | `int`                         | Default 50, max 200                        |
| `offset`    | `int`                         | Pagination offset                          |

## TypeScript types

```typescript
type ApiType = 'wasi-http' | 'proxy-wasm'

// GET /template (list item) and create/update response
interface TemplateShort {
  id: number
  name: string
  short_descr?: string
  long_descr?: string
  api_type: ApiType
  owned: boolean
}

// GET /template/{id} (full detail)
interface Template extends TemplateShort {
  binary_id: number
  params: TemplateParam[]
}

// POST body
interface CreateTemplate {
  binary_id: number
  name: string
  short_descr?: string
  long_descr?: string
  owned: boolean
  params: TemplateParam[]
}

// PUT body — same shape as CreateTemplate
type UpdateTemplate = CreateTemplate
```

## Params schema

Each template carries a `params: TemplateParam[]` array that describes the env
vars and secrets a user must (or may) configure when creating an app from the
template.

```typescript
type ParamDataType = 'string' | 'number' | 'boolean' | 'enum' | 'json'

interface TemplateParam {
  name: string // env var / secret key name, e.g. "DEFAULT_THEME"
  data_type: ParamDataType
  descr: string // human-readable description shown in the UI
  mandatory: boolean // whether the user must supply a value
  metadata: string // JSON-encoded string — see below
}
```

### The `metadata` field

`metadata` is always a **JSON-encoded string** (not an object). Its internal
structure depends on `data_type`:

| `data_type` | `metadata` shape                                                        | Notes                            |
| ----------- | ----------------------------------------------------------------------- | -------------------------------- |
| `string`    | `""` or `{"default_value":"..."}`                                       | Empty string when no default     |
| `number`    | `""` or `{"default_value":"42"}`                                        | Default stored as string         |
| `boolean`   | `""` or `{"default_value":"true"}`                                      | Default stored as string         |
| `json`      | `{"default_value":"{\"key\":\"val\"}"}`                                 | Default is a JSON-escaped string |
| `enum`      | `{"enum_values":[{"value":"...","label":"..."}],"default_value":"..."}` | See example below                |

**Enum example** (from template 617 `shop-front`):

```json
{
  "name": "DEFAULT_THEME",
  "data_type": "enum",
  "mandatory": false,
  "descr": "",
  "metadata": "{\"enum_values\":[{\"value\":\"tech\",\"label\":\"Tech\"},{\"value\":\"botique\",\"label\":\"Botique\"}],\"default_value\":\"botique\"}"
}
```

**JSON example** (from template 400 `dangling2`):

```json
{
  "name": "json-var",
  "data_type": "json",
  "mandatory": false,
  "descr": "",
  "metadata": "{\"default_value\":\"{\\\"hello\\\": \\\"world\\\"}\"}"
}
```

> **Gotcha**: when constructing `metadata` in code, always `JSON.stringify` the
> inner object first, then pass the resulting string as the `metadata` value —
> do not nest raw objects.

## Real examples

### Template 2 — Geolocation-based redirect (wasi-http, not owned)

```json
{
  "binary_id": 538706,
  "params": [
    {
      "name": "DEFAULT",
      "data_type": "string",
      "mandatory": true,
      "descr": "Default URL, when user country doesn't match",
      "metadata": ""
    }
  ]
}
```

### Template 6 — S3 uploader (wasi-http, not owned)

```json
{
  "binary_id": 121,
  "params": [
    {
      "name": "ACCESS_KEY",
      "data_type": "string",
      "mandatory": true,
      "descr": "Access key"
    },
    {
      "name": "SECRET_KEY",
      "data_type": "string",
      "mandatory": true,
      "descr": "Secret key"
    },
    {
      "name": "BUCKET",
      "data_type": "string",
      "mandatory": true,
      "descr": "Bucket name"
    },
    {
      "name": "REGION",
      "data_type": "string",
      "mandatory": true,
      "descr": "Region name"
    },
    {
      "name": "BASE_HOSTNAME",
      "data_type": "string",
      "mandatory": true,
      "descr": "Base domain (without region)"
    },
    {
      "name": "SCHEME",
      "data_type": "string",
      "mandatory": false,
      "descr": "Scheme (http or https, http by default)"
    },
    {
      "name": "MAX_FILE_SIZE",
      "data_type": "number",
      "mandatory": false,
      "descr": "Max allowed file size in bytes"
    }
  ]
}
```

### Template 400 — dangling2 (wasi-http, owned) — covers enum + json

```json
{
  "binary_id": 251607,
  "params": [
    {
      "name": "enum-var",
      "data_type": "enum",
      "mandatory": false,
      "descr": "",
      "metadata": "{\"enum_values\":[{\"value\":\"first\",\"label\":\"One\"},{\"value\":\"second\",\"label\":\"Two\"}],\"default_value\":\"second\"}"
    },
    {
      "name": "json-var",
      "data_type": "json",
      "mandatory": false,
      "descr": "",
      "metadata": "{\"default_value\":\"{\\\"hello\\\": \\\"world\\\"}\"}"
    },
    {
      "name": "string-var",
      "data_type": "string",
      "mandatory": true,
      "descr": "",
      "metadata": ""
    }
  ]
}
```
