interface ApiConfig {
  apiKey: string
  apiUrl: string
}

type ApiType = 'wasi-http' | 'proxy-wasm'

type PaginationParams = {
  limit?: number
  offset?: number
}

type OrderingValue<T extends string> = T | `-${T}`
type OrderingParams<T extends string = never> = {
  ordering?: OrderingValue<T>
}

export type { ApiConfig, ApiType, PaginationParams, OrderingParams }

export * from './apps/types.js'
export * from './binaries/types.js'
export * from './secrets/types.js'
