import path from 'node:path'
import fs from 'node:fs'

import { ApiConfig, GetBinaryResponse, UploadBinaryResponse } from '../types.js'

async function uploadBinary(
  apiConfig: ApiConfig,
  wasmPath: string
): Promise<UploadBinaryResponse> {
  try {
    const normalizedPath = path.normalize(wasmPath)
    const wasmBuffer = fs.readFileSync(normalizedPath)

    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/binaries/raw`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: `APIKey ${apiConfig.apiKey}`
        },
        body: wasmBuffer
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as Promise<UploadBinaryResponse>
  } catch (error) {
    throw new Error(
      `Error uploading binary: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function getBinary(
  apiConfig: ApiConfig,
  id: string | number
): Promise<GetBinaryResponse> {
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/binaries/${id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `APIKey ${apiConfig.apiKey}`
        }
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const fetchedBinary = (await response.json()) as GetBinaryResponse
    return {
      ...fetchedBinary,
      id: Number.parseInt(id.toString(), 10) // Ensure ID is included and always a number
    }
  } catch (error) {
    throw new Error(
      `Error fetching binary: ${error instanceof Error ? error.message : error}`
    )
  }
}

export { getBinary, uploadBinary }
