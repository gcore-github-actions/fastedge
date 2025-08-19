import { ApiType } from '../types.js'

interface UploadBinaryResponse {
  id: number
  api_type: ApiType
  checksum: string
  status: number
  unref_since: string
}

interface GetBinaryResponse {
  api_type: ApiType
  checksum: string
  id: number
  source: number
  status: number
}

export type { GetBinaryResponse, UploadBinaryResponse }
