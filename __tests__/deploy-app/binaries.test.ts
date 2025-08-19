import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import fs from 'node:fs'

import { createMockHttpResponse } from '../../__fixtures__/mockResponse.js'
import { getBinary, uploadBinary } from '../../src/api-utils/binaries/index'
import {
  ApiType,
  GetBinaryResponse,
  UploadBinaryResponse
} from '../../src/api-utils/types'

const mockApiUrl = 'https://api.example.com'
const mockApiKey = 'test-api-key'
const mockApiConfig = {
  apiUrl: mockApiUrl,
  apiKey: mockApiKey
}

describe('Binaries functions', () => {
  describe('getBinary', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a singular binary and returns response', async () => {
      const mockBinaryObj = {
        id: 56891,
        api_type: 'wasi-http' as ApiType,
        checksum: 'my-checksum-string',
        source: 1,
        status: 1
      }
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse<GetBinaryResponse>({
              ok: true,
              data: mockBinaryObj
            })
          )
        })

      const result = await getBinary(mockApiConfig, 56891)
      expect(result).toEqual(mockBinaryObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/binaries/56891`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('throws error if response is not ok', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: false
            })
          )
        })

      await expect(getBinary(mockApiConfig, 123)).rejects.toThrow(
        'Error fetching binary: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getBinary(mockApiConfig, 123)).rejects.toThrow(
        'Error fetching binary: Network error'
      )
    })
  })

  describe('uploadBinary', () => {
    const mockWasmPath = '/tmp/test.wasm'
    const mockWasmBuffer = Buffer.from('wasm-binary')

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('uploads binary and returns response', async () => {
      const mockBinaryObj = {
        id: 789456,
        api_type: 'proxy-wasm' as ApiType,
        checksum: 'test-checksum',
        status: 200,
        unref_since: new Date().toISOString()
      }

      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        return mockWasmBuffer
      })

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse<UploadBinaryResponse>({
              ok: true,
              data: mockBinaryObj
            })
          )
        })

      const result = await uploadBinary(mockApiConfig, mockWasmPath)
      expect(result).toEqual(mockBinaryObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/binaries/raw`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: mockWasmBuffer
        })
      )
    })

    it('throws error if response is not ok', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        return mockWasmBuffer
      })
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: false
            })
          )
        })

      await expect(uploadBinary(mockApiConfig, mockWasmPath)).rejects.toThrow(
        'Error uploading binary: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        return mockWasmBuffer
      })
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(uploadBinary(mockApiConfig, mockWasmPath)).rejects.toThrow(
        'Error uploading binary: Network error'
      )
    })

    it('throws error if readFileSync throws', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found')
      })
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: false
            })
          )
        })

      await expect(uploadBinary(mockApiConfig, mockWasmPath)).rejects.toThrow(
        'Error uploading binary: File not found'
      )
    })
  })
})
