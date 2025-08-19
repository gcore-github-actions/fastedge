import { describe, it, expect, beforeEach, jest } from '@jest/globals'

import { createMockHttpResponse } from '../../__fixtures__/mockResponse.js'
import {
  createSecret,
  getSecret,
  getSecretByName,
  getSecrets,
  updateSecret
} from '../../src/api-utils/secrets/index.js'

import type {
  CreateSecretResource,
  CreateSecretResponse,
  GetSecretResponse,
  GetSecretsResponse,
  GetSecretsResponseItem,
  UpdateSecretResource,
  UpdateSecretResponse
} from '../../src/api-utils/secrets/types.js'

const mockApiUrl = 'https://api.example.com'
const mockApiKey = 'test-api-key'
const mockApiConfig = {
  apiUrl: mockApiUrl,
  apiKey: mockApiKey
}

describe('Secrets functions', () => {
  describe('getSecret', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a singular secret and returns response', async () => {
      const mockSecretObj: GetSecretResponse = {
        id: 12345,
        name: 'database-password',
        app_count: 2,
        comment: 'Production database password',
        secret_slots: [
          {
            slot: 0,
            value: 'encrypted-password-value'
          }
        ]
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: mockSecretObj
            })
          )
        })

      const result = await getSecret(mockApiConfig, 12345)
      expect(result).toEqual(mockSecretObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/secrets/12345`,
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

      await expect(getSecret(mockApiConfig, 999)).rejects.toThrow(
        'Error fetching secret: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getSecret(mockApiConfig, 12345)).rejects.toThrow(
        'Error fetching secret: Network error'
      )
    })
  })

  describe('getSecretByName', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a singular secret by name and returns full secret response', async () => {
      const mockSecretListItem: GetSecretsResponseItem = {
        id: 12345,
        name: 'database-password',
        comment: 'Production database password',
        app_count: 2
      }

      const mockFullSecretResponse: GetSecretResponse = {
        id: 12345,
        name: 'database-password',
        app_count: 2,
        comment: 'Production database password',
        secret_slots: [
          {
            slot: 0,
            value: 'encrypted-password-value'
          }
        ]
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementationOnce((): Promise<Response> => {
          // First call to getSecrets for name lookup
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { secrets: [mockSecretListItem] }
            })
          )
        })
        .mockImplementationOnce((): Promise<Response> => {
          // Second call to getSecret for full details
          return Promise.resolve(
            createMockHttpResponse<GetSecretResponse>({
              ok: true,
              data: mockFullSecretResponse
            })
          )
        })

      const result = await getSecretByName(mockApiConfig, 'database-password')

      expect(result).toEqual(mockFullSecretResponse)

      // Verify both API calls were made
      expect(globalThis.fetch).toHaveBeenCalledTimes(2)

      // First call to getSecrets with name filter
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        1,
        `${mockApiUrl}/fastedge/v1/secrets?secret_name=database-password`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )

      // Second call to getSecret with specific ID
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        `${mockApiUrl}/fastedge/v1/secrets/12345`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('throws an error if it cannot find a secret matching the name', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { secrets: [] }
            })
          )
        })

      const name = 'non-existent-secret'
      await expect(getSecretByName(mockApiConfig, name)).rejects.toThrow(
        `Secret with name "${name}" not found`
      )

      // Should only call getSecrets, not getSecret
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/secrets?secret_name=non-existent-secret`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('throws error if getSecrets response is not ok', async () => {
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
        getSecretByName(mockApiConfig, 'non-existent-secret')
      ).rejects.toThrow('Error fetching secrets: Bad Request')

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('throws error if getSecrets fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(
        getSecretByName(mockApiConfig, 'database-password')
      ).rejects.toThrow('Error fetching secrets: Network error')

      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('throws error if getSecret fails after successful getSecrets call', async () => {
      const mockSecretListItem: GetSecretsResponseItem = {
        id: 12345,
        name: 'database-password',
        comment: 'Production database password',
        app_count: 2
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementationOnce((): Promise<Response> => {
          // First call to getSecrets succeeds
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { secrets: [mockSecretListItem] }
            })
          )
        })
        .mockImplementationOnce((): Promise<Response> => {
          // Second call to getSecret fails
          return Promise.resolve(
            createMockHttpResponse({
              ok: false
            })
          )
        })

      await expect(
        getSecretByName(mockApiConfig, 'database-password')
      ).rejects.toThrow('Error fetching secret: Bad Request')

      expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('getSecrets', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a list of secrets and returns response', async () => {
      const mockSecretsObj: GetSecretsResponse = [
        {
          id: 12345,
          name: 'database-password',
          comment: 'Production database password',
          app_count: 2
        },
        {
          id: 67890,
          name: 'api-token',
          comment: 'External service API token',
          app_count: 1
        }
      ]

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { secrets: mockSecretsObj }
            })
          )
        })

      const result = await getSecrets(mockApiConfig, {})
      expect(result).toEqual(mockSecretsObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/secrets`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('fetches secrets with query parameters', async () => {
      const mockSecretsObj: GetSecretsResponse = [
        {
          id: 67890,
          name: 'api-token',
          comment: 'External service API token',
          app_count: 1
        }
      ]

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { secrets: mockSecretsObj }
            })
          )
        })

      const result = await getSecrets(mockApiConfig, {
        app_id: 10
      })
      expect(result).toEqual(mockSecretsObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/secrets?app_id=10`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('handles empty query parameters', async () => {
      const mockSecretsObj: GetSecretsResponse = []

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: { secrets: mockSecretsObj }
            })
          )
        })

      const result = await getSecrets(mockApiConfig, {})
      expect(result).toEqual(mockSecretsObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/secrets`,
        expect.objectContaining({
          method: 'GET'
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

      await expect(getSecrets(mockApiConfig, {})).rejects.toThrow(
        'Error fetching secrets: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getSecrets(mockApiConfig, {})).rejects.toThrow(
        'Error fetching secrets: Network error'
      )
    })
  })

  describe('createSecret', () => {
    const mockSecretResource: CreateSecretResource = {
      name: 'new-api-key',
      comment: 'New API key for external service',
      secret_slots: [
        {
          slot: -5,
          value: 'secret-api-key-value'
        },
        {
          slot: 15,
          value: 'backup-api-key-value'
        }
      ]
    }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('creates a secret and returns response', async () => {
      const mockSecretResponse: CreateSecretResponse = {
        id: 98765,
        name: 'new-api-key',
        comment: 'New API key for external service',
        app_count: 0,
        secret_slots: [
          {
            slot: -5,
            value: 'secret-api-key-value'
          },
          {
            slot: 15,
            value: 'backup-api-key-value'
          }
        ]
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: mockSecretResponse
            })
          )
        })

      const result = await createSecret(mockApiConfig, mockSecretResource)
      expect(result).toEqual(mockSecretResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/secrets`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: JSON.stringify(mockSecretResource)
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

      await expect(
        createSecret(mockApiConfig, mockSecretResource)
      ).rejects.toThrow('Error creating secret: Bad Request')
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(
        createSecret(mockApiConfig, mockSecretResource)
      ).rejects.toThrow('Error creating secret: Network error')
    })
  })

  describe('updateSecret', () => {
    const mockUpdateResource: UpdateSecretResource = {
      id: 12345,
      name: 'updated-secret-name',
      comment: 'Updated description for the secret',
      secret_slots: [
        {
          slot: 0,
          value: 'updated-secret-value'
        },
        {
          slot: 2,
          value: 'new-slot-value'
        }
      ]
    }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('updates a secret and returns response', async () => {
      const mockSecretResponse: UpdateSecretResponse = {
        ...mockUpdateResource,
        app_count: 3
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockHttpResponse({
              ok: true,
              data: mockSecretResponse
            })
          )
        })

      const result = await updateSecret(mockApiConfig, mockUpdateResource)
      expect(result).toEqual(mockSecretResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/secrets/12345`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: JSON.stringify(mockUpdateResource)
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

      await expect(
        updateSecret(mockApiConfig, mockUpdateResource)
      ).rejects.toThrow('Error updating secret: Bad Request')
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(
        updateSecret(mockApiConfig, mockUpdateResource)
      ).rejects.toThrow('Error updating secret: Network error')
    })
  })
})
