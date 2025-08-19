import {
  ApiType,
  AppSecrets,
  GetBinaryResponse,
  OrderingParams,
  PaginationParams
} from '../types.js'

/**
// * Apps Base Resource
**/

interface AppResource {
  id: number
  api_type: ApiType
  binary: number
  comment: string
  env: Record<string, string>
  log: string
  name: string
  networks: Array<string>
  plan: string
  plan_id: number
  rsp_headers: Record<string, string>
  secrets: AppSecrets
  status: number
  template: number
  template_name: string
  url: string
}

/**
// * Fetching Single App
**/

type GetAppResponse = Pick<
  AppResource,
  | 'id'
  | 'api_type'
  | 'binary'
  | 'comment'
  | 'env'
  | 'log'
  | 'name'
  | 'networks'
  | 'plan'
  | 'plan_id'
  | 'rsp_headers'
  | 'secrets'
  | 'status'
  | 'url'
> &
  Partial<Pick<AppResource, 'template' | 'template_name'>>

type GetAppResponseWithBinary = Omit<GetAppResponse, 'binary'> & {
  binary: GetBinaryResponse
}

// type GetAppResponseWithTemplate = Omit<GetAppResponse, 'template'> & {
//   template: GetTemplateResponse
// }

/**
// * Fetching Apps List
**/

type AppsOrderingFields =
  | 'binary'
  | 'id'
  | 'name'
  | 'plan'
  | 'status'
  | 'template'

interface GetAppsQueryParams
  extends PaginationParams,
    OrderingParams<AppsOrderingFields> {
  api_type?: ApiType
  name?: string
  binary?: number
  status?: number
  plan?: number
  template?: number
}

type GetAppsResponseItem = Pick<
  AppResource,
  | 'api_type'
  | 'binary'
  | 'comment'
  | 'id'
  | 'name'
  | 'networks'
  | 'plan'
  | 'plan_id'
  | 'status'
  | 'url'
>

type GetAppsResponse = Array<GetAppsResponseItem>

/**
// * Create App
**/

type CreateAppBase = Pick<
  AppResource,
  'api_type' | 'status' | 'env' | 'rsp_headers' | 'secrets' | 'comment'
> &
  Partial<Pick<AppResource, 'name'>>

type CreateAppFromBinaryResource = CreateAppBase & Pick<AppResource, 'binary'>
type CreateAppFromTemplateResource = CreateAppBase &
  Pick<AppResource, 'template'>

type CreateAppResource =
  | CreateAppFromBinaryResource
  | CreateAppFromTemplateResource

type CreateAppResponse = Pick<
  AppResource,
  'id' | 'api_type' | 'binary' | 'name' | 'url' | 'status' | 'plan' | 'plan_id'
>

/**
// * Update App
**/

type UpdateAppResource = Pick<
  AppResource,
  | 'id'
  | 'api_type'
  | 'binary'
  | 'comment'
  | 'status'
  | 'env'
  | 'rsp_headers'
  | 'secrets'
  | 'comment'
  | 'url'
> &
  Partial<Pick<AppResource, 'name'>>

type UpdateAppResponse = CreateAppResponse

/**
// * Enhanced App Types
**/

interface EnhancedAppResponse<T = GetAppResponse> extends Promise<T> {
  includeBinary(): EnhancedAppResponse<GetAppResponseWithBinary>
  // includeTemplate(): EnhancedAppResponse<GetAppResponseWithTemplate>
}

export type {
  CreateAppFromTemplateResource,
  CreateAppResource,
  CreateAppResponse,
  EnhancedAppResponse,
  GetAppResponse,
  GetAppResponseWithBinary,
  GetAppsQueryParams,
  GetAppsResponse,
  GetAppsResponseItem,
  UpdateAppResource,
  UpdateAppResponse
}
