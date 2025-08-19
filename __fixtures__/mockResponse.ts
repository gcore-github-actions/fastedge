import {
  ApiType,
  GetAppResponse,
  GetAppResponseWithBinary,
  GetAppsResponseItem,
  UpdateAppResource
} from '../src/api-utils/types'

// Helper to create a minimal Response-like object
function createMockHttpResponse<T>(options: {
  ok: boolean
  data?: T
}): Response {
  return {
    ok: options.ok,
    json: async () => options.data as T,
    // Add required Response properties with default values
    headers: new Headers(),
    redirected: false,
    status: options.ok ? 200 : 400,
    statusText: options.ok ? 'OK' : 'Bad Request',
    type: 'basic',
    url: '',
    clone: () => createMockHttpResponse(options),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => ''
  } as Response
}

function createMockGetAppResponse(
  options: Partial<GetAppResponse>
): GetAppResponse {
  const name = options.name || 'mock-app'
  return {
    id: 100,
    api_type: 'proxy-wasm',
    binary: 101,
    comment: 'mock app for testing',
    name,
    status: 1,
    env: {},
    rsp_headers: {},
    secrets: {},
    log: 'kafka',
    networks: ['gcore'],
    plan: 'mock-plan',
    plan_id: 1,
    url: `https://${name}.gcore.com`,
    ...options
  }
}

function createMockGetAppResponseItem(
  options: Partial<GetAppsResponseItem>
): GetAppsResponseItem {
  const name = options.name || 'mock-app'
  return {
    id: 100,
    api_type: 'proxy-wasm',
    binary: 101,
    comment: 'mock app for testing',
    name,
    status: 1,
    networks: ['gcore'],
    plan: 'mock-plan',
    plan_id: 1,
    url: `https://${name}.gcore.com`,
    ...options
  }
}

function createMockUpdateAppResource(
  options: Partial<UpdateAppResource>
): UpdateAppResource {
  const name = options.name || 'mock-app'
  return {
    id: 100,
    api_type: 'proxy-wasm',
    binary: 101,
    comment: 'mock app for testing',
    name,
    status: 1,
    env: {},
    rsp_headers: {},
    secrets: {},
    url: `https://${name}.gcore.com`,
    ...options
  }
}

function createMockGetAppResponseWithBinary(
  options: Partial<GetAppResponseWithBinary>
): GetAppResponseWithBinary {
  const name = options.name || 'mock-app'
  const binaryOptions = {
    id: 101,
    api_type: 'proxy-wasm' as ApiType,
    checksum: 'mock-checksum',
    status: 1,
    source: 1,
    ...(options.binary || {})
  }

  return {
    id: 100,
    api_type: 'proxy-wasm',
    comment: 'mock app for testing',
    name,
    status: 1,
    networks: ['gcore'],
    plan: 'mock-plan',
    plan_id: 1,
    env: {},
    log: 'kafka',
    rsp_headers: {},
    secrets: {},
    url: `https://${name}.gcore.com`,
    ...options,
    binary: binaryOptions
  }
}

export {
  createMockHttpResponse,
  createMockGetAppResponse,
  createMockGetAppResponseItem,
  createMockGetAppResponseWithBinary,
  createMockUpdateAppResource
}
