import { ApiType, PaginationParams } from '../types.js'

type ParamDataType = 'string' | 'number' | 'boolean' | 'enum' | 'json'

interface TemplateParam {
  name: string
  data_type: ParamDataType
  descr: string
  mandatory: boolean
  metadata: string // JSON-encoded string — see context/api/fastedge-templates.md
}

/**
// * Template Short (list item, create/update response)
**/

interface TemplateShort {
  id: number
  name: string
  short_descr?: string
  long_descr?: string
  api_type: ApiType
  owned: boolean
}

/**
// * Template Full (GET /template/{id} response)
**/

interface GetTemplateResponse extends TemplateShort {
  binary_id: number
  params: TemplateParam[]
}

/**
// * List templates
**/

interface GetTemplatesQueryParams extends PaginationParams {
  api_type?: ApiType
  only_mine?: boolean
}

type GetTemplatesResponse = TemplateShort[]

/**
// * Create template
**/

interface CreateTemplateResource {
  binary_id: number
  name: string
  short_descr?: string
  long_descr?: string
  owned: boolean
  params: TemplateParam[]
}

/**
// * Update template (PUT body — same fields, plus id for URL routing)
**/

type UpdateTemplateResource = CreateTemplateResource & { id: number }

export type {
  CreateTemplateResource,
  GetTemplateResponse,
  GetTemplatesQueryParams,
  GetTemplatesResponse,
  ParamDataType,
  TemplateParam,
  TemplateShort,
  UpdateTemplateResource
}
