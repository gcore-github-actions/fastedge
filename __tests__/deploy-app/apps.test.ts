import { describe, it, expect, beforeEach, jest } from '@jest/globals'

import {
  createMockGetAppResponse,
  createMockGetAppResponseItem,
  createMockHttpResponse
} from '../../__fixtures__/mockResponse.js'
import {
  appendAppIncludes,
  createApp,
  getApp,
  getAppByName,
  getApps,
  updateApp
} from '../../src/api-utils/apps/index.js'

import type {
  ApiType,
  CreateAppFromTemplateResource,
  CreateAppResource,
  CreateAppResponse,
  GetAppResponse,
  GetAppsResponse,
  GetBinaryResponse,
  UpdateAppResource,
  UpdateAppResponse
} from '../../src/api-utils/types.js'

const mockApiUrl = 'https://api.example.com'
const mockApiKey = 'test-api-key'
const mockApiConfig = {
  apiUrl: mockApiUrl,
  apiKey: mockApiKey
}

describe('Application functions', () => {
  describe('getApp', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a singular application and returns response', async () => {
      const mockAppObj = createMockGetAppResponse({
        id: 56891,
        binary: 12345,
        name: 'gnome-maze'
      })

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse<GetAppResponse>({
              ok: true,
              data: mockAppObj
            })
          )
        })

      const result = await getApp(mockApiConfig, 56891)
      expect(result).toEqual(mockAppObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps/56891`,
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

      await expect(getApp(mockApiConfig, 556)).rejects.toThrow(
        'Error fetching application: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getApp(mockApiConfig, 564)).rejects.toThrow(
        'Error fetching application: Network error'
      )
    })
  })

  describe('getAppByName', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a singular application by name and returns full app response', async () => {
      const mockAppListItem = createMockGetAppResponseItem({
        id: 56891,
        binary: 12345,
        name: 'gnome-maze'
      })

      const mockFullAppResponse = createMockGetAppResponse({
        id: 56891,
        binary: 12345,
        env: { NODE_ENV: 'production' },
        name: 'gnome-maze',
        rsp_headers: { 'Content-Type': 'application/json' },
        secrets: { api_key: { id: 123 } }
      })

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementationOnce((): Promise<Response> => {
          // First call to getApps
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { apps: [mockAppListItem] }
            })
          )
        })
        .mockImplementationOnce((): Promise<Response> => {
          // Second call to getApp
          return Promise.resolve(
            createMockHttpResponse<GetAppResponse>({
              ok: true,
              data: mockFullAppResponse
            })
          )
        })

      const result = await getAppByName(mockApiConfig, 'gnome-maze')

      expect(result).toEqual(mockFullAppResponse)

      // Verify both API calls were made
      expect(globalThis.fetch).toHaveBeenCalledTimes(2)

      // First call to getApps with name filter
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        1,
        `${mockApiUrl}/fastedge/v1/apps?name=gnome-maze`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )

      // Second call to getApp with specific ID
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        `${mockApiUrl}/fastedge/v1/apps/56891`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('throws an error if it cannot find an application matching the name', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { apps: [] }
            })
          )
        })

      const name = 'non-existent-app'
      await expect(getAppByName(mockApiConfig, name)).rejects.toThrow(
        `Application with name "${name}" not found`
      )

      // Should only call getApps, not getApp
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps?name=non-existent-app`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('throws error if getApps response is not ok', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: false
            })
          )
        })

      await expect(
        getAppByName(mockApiConfig, 'non-existent-app')
      ).rejects.toThrow('Error fetching applications: Bad Request')

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('throws error if getApps fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getAppByName(mockApiConfig, 'gnome-maze')).rejects.toThrow(
        'Error fetching applications: Network error'
      )

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('throws error if getApp fails after successful getApps call', async () => {
      const mockAppListItem = createMockGetAppResponseItem({
        name: 'gnome-maze'
      })

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementationOnce((): Promise<Response> => {
          // First call to getApps succeeds
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { apps: [mockAppListItem] }
            })
          )
        })
        .mockImplementationOnce((): Promise<Response> => {
          // Second call to getApp fails
          return Promise.resolve(
            createMockHttpResponse({
              ok: false
            })
          )
        })

      await expect(getAppByName(mockApiConfig, 'gnome-maze')).rejects.toThrow(
        'Error fetching application: Bad Request'
      )

      expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('appendAppIncludes', () => {
    const mockAppWithBinary = createMockGetAppResponse({
      id: 56891,
      binary: 12345,
      name: 'gnome-maze'
    })

    const mockAppWithoutBinary = createMockGetAppResponse({
      id: 56892,
      binary: undefined,
      name: 'gnome-chess'
    })

    const mockBinaryResponse: GetBinaryResponse = {
      id: 12345,
      api_type: 'wasi-http' as ApiType,
      checksum: 'abc123def456',
      source: 1,
      status: 1
    }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('returns enhanced app response without chaining', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithBinary)

      const result = await appendAppIncludes(mockApiConfig, mockGetAppFn)

      expect(result).toEqual(mockAppWithBinary)
      expect(mockGetAppFn).toHaveBeenCalledTimes(1)
    })

    it('includes binary data when includeBinary is chained', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithBinary)

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse<GetBinaryResponse>({
              ok: true,
              data: mockBinaryResponse
            })
          )
        })

      const result = await appendAppIncludes(
        mockApiConfig,
        mockGetAppFn
      ).includeBinary()

      expect(result).toEqual({
        ...mockAppWithBinary,
        binary: mockBinaryResponse
      })
      expect(mockGetAppFn).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/binaries/12345`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('handles app without binary when includeBinary is chained', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithoutBinary)

      const result = await appendAppIncludes(
        mockApiConfig,
        mockGetAppFn
      ).includeBinary()

      expect(result).toEqual(mockAppWithoutBinary)
      expect(mockGetAppFn).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('supports multiple chaining of includeBinary', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithBinary)

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse<GetBinaryResponse>({
              ok: true,
              data: mockBinaryResponse
            })
          )
        })

      const result = await appendAppIncludes(mockApiConfig, mockGetAppFn)
        .includeBinary()
        .includeBinary()
        .includeBinary()

      expect(result).toEqual({
        ...mockAppWithBinary,
        binary: mockBinaryResponse
      })
      expect(mockGetAppFn).toHaveBeenCalledTimes(1)
      // Should only fetch binary once due to caching
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('throws error when binary fetch fails with includeBinary', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithBinary)

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: false
            })
          )
        })

      await expect(
        appendAppIncludes(mockApiConfig, mockGetAppFn).includeBinary()
      ).rejects.toThrow('Error fetching binary: Bad Request')
    })

    it('handles network errors gracefully', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockRejectedValue(new Error('Network error'))

      await expect(
        appendAppIncludes(mockApiConfig, mockGetAppFn)
      ).rejects.toThrow('Network error')
    })

    it('works with getApp function wrapper', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse<GetAppResponse>({
              ok: true,
              data: mockAppWithBinary
            })
          )
        })

      const result = await appendAppIncludes(mockApiConfig, () =>
        getApp(mockApiConfig, 56891)
      )

      expect(result).toEqual(mockAppWithBinary)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps/56891`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('works with getAppByName function wrapper', async () => {
      const mockAppListItem = createMockGetAppResponseItem({
        id: 56891,
        binary: 12345,
        name: 'gnome-maze'
      })

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementationOnce((): Promise<Response> => {
          // First call to getApps for name lookup
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { apps: [mockAppListItem] }
            })
          )
        })
        .mockImplementationOnce((): Promise<Response> => {
          // Second call to getApp for full details
          return Promise.resolve(
            createMockHttpResponse<GetAppResponse>({
              ok: true,
              data: mockAppWithBinary
            })
          )
        })

      const result = await appendAppIncludes(mockApiConfig, () =>
        getAppByName(mockApiConfig, 'gnome-maze')
      )

      expect(result).toEqual(mockAppWithBinary)

      // Verify both API calls were made
      expect(globalThis.fetch).toHaveBeenCalledTimes(2)

      // First call to getApps with name filter
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        1,
        `${mockApiUrl}/fastedge/v1/apps?name=gnome-maze`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )

      // Second call to getApp with specific ID
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        `${mockApiUrl}/fastedge/v1/apps/56891`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })
  })

  describe('getApps', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a list of applications and returns response', async () => {
      const mockAppsObj: GetAppsResponse = [
        createMockGetAppResponseItem({
          id: 56891,
          binary: 12345,
          name: 'gnome-maze',
          comment: 'Test app'
        }),
        createMockGetAppResponseItem({
          id: 561,
          binary: 45,
          name: 'strange-love',
          comment: 'Test app 2'
        })
      ]
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { apps: mockAppsObj }
            })
          )
        })

      const result = await getApps(mockApiConfig, {})
      expect(result).toEqual(mockAppsObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('fetches a list of applications using the query params and returns response', async () => {
      const mockAppsObj = [
        createMockGetAppResponseItem({
          name: 'gnome-maze'
        })
      ]
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { apps: mockAppsObj }
            })
          )
        })

      const result = await getApps(mockApiConfig, { name: 'gnome-maze' })
      expect(result).toEqual(mockAppsObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps?name=gnome-maze`,
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

      await expect(getApps(mockApiConfig, {})).rejects.toThrow(
        'Error fetching applications: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getApps(mockApiConfig, {})).rejects.toThrow(
        'Error fetching applications: Network error'
      )
    })
  })

  describe('createApp', () => {
    const mockAppResource: CreateAppResource = {
      api_type: 'wasi-http' as ApiType,
      binary: 159487,
      status: 1,
      rsp_headers: {},
      env: {},
      secrets: {},
      comment: 'Test application'
    }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('creates an application from a binary and returns response', async () => {
      const mockAppResponse: CreateAppResponse = {
        id: 789456,
        api_type: 'wasi-http' as ApiType,
        binary: 159487,
        status: 200,
        name: 'gnome-maze',
        plan: 'small_euro',
        plan_id: 2,
        url: 'https://gnome-maze.preprod-world.org'
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: mockAppResponse
            })
          )
        })

      const result = await createApp(mockApiConfig, mockAppResource)
      expect(result).toEqual(mockAppResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: JSON.stringify(mockAppResource)
        })
      )
    })

    it('creates an application from a template and returns response', async () => {
      const mockAppTemplateResource: CreateAppFromTemplateResource = {
        api_type: 'wasi-http' as ApiType,
        name: 'template-dwarf',
        template: 15,
        status: 1,
        rsp_headers: {},
        env: {},
        secrets: {},
        comment: 'Test Template application'
      }

      const mockAppResponse = {
        id: 789456,
        api_type: 'wasi-http' as ApiType,
        binary: 159487,
        status: 200,
        plan: 'small_euro',
        plan_id: 2,
        name: 'template-dwarf',
        url: 'https://template-dwarf.preprod-world.org'
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse<CreateAppResponse>({
              ok: true,
              data: mockAppResponse
            })
          )
        })

      const result = await createApp(mockApiConfig, mockAppTemplateResource)
      expect(result).toEqual(mockAppResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: JSON.stringify(mockAppTemplateResource)
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

      await expect(createApp(mockApiConfig, mockAppResource)).rejects.toThrow(
        'Error creating application: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(createApp(mockApiConfig, mockAppResource)).rejects.toThrow(
        'Error creating application: Network error'
      )
    })
  })

  describe('updateApp', () => {
    const mockAppResource: UpdateAppResource = {
      id: 123456,
      api_type: 'wasi-http' as ApiType,
      binary: 159487,
      name: 'snake-hips',
      status: 1,
      rsp_headers: {},
      env: {},
      secrets: {},
      comment: 'Test application',
      url: 'https://snake-hips.preprod-world.org'
    }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('update an application and returns response', async () => {
      const mockAppResponse: UpdateAppResponse = {
        id: 123456,
        api_type: 'wasi-http' as ApiType,
        binary: 159487,
        status: 200,
        name: 'snake-hips',
        plan: 'small_euro',
        plan_id: 2,
        url: 'https://snake-hips.preprod-world.org'
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: mockAppResponse
            })
          )
        })

      const result = await updateApp(mockApiConfig, mockAppResource)
      expect(result).toEqual(mockAppResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps/123456`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: JSON.stringify(mockAppResource)
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

      await expect(updateApp(mockApiConfig, mockAppResource)).rejects.toThrow(
        'Error updating application: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(updateApp(mockApiConfig, mockAppResource)).rejects.toThrow(
        'Error updating application: Network error'
      )
    })
  })
})
