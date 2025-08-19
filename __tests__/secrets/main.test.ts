import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  CreateSecretResponse,
  GetSecretResponse,
  SecretResource,
  UpdateSecretResponse
} from '../../src/api-utils/types.js'

// Create mock functions before mocking modules
const mockGetInput = jest.fn<(name: string) => string>()
const mockSetOutput = jest.fn()
const mockSetFailed = jest.fn()
const mockNotice = jest.fn()
const mockDebug = jest.fn()
const mockInfo = jest.fn()

const mockCreateSecretResourceFromInputs = jest.fn()
const mockFilterSecretSlots = jest.fn()
const mockIsUpdateNeeded = jest.fn()

const mockGetSecrets = jest.fn()
const mockGetSecret = jest.fn()
const mockGetSecretByName = jest.fn()
const mockCreateSecret = jest.fn()
const mockUpdateSecret = jest.fn()

// Mock @actions/core module
jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
  setFailed: mockSetFailed,
  notice: mockNotice,
  debug: mockDebug,
  info: mockInfo,
  warning: jest.fn(),
  error: jest.fn()
}))

// Mock utils module
jest.unstable_mockModule('../../src/secrets/utils.js', () => ({
  createSecretResourceFromInputs: mockCreateSecretResourceFromInputs,
  filterSecretSlots: mockFilterSecretSlots,
  isUpdateNeeded: mockIsUpdateNeeded
}))

// Mock FastEdgeClient
jest.unstable_mockModule('../../src/api-utils/index.js', () => ({
  FastEdgeClient: jest.fn().mockImplementation(() => ({
    secrets: {
      getAll: mockGetSecrets,
      get: mockGetSecret,
      getByName: mockGetSecretByName,
      create: mockCreateSecret,
      update: mockUpdateSecret
    }
  }))
}))

// Import the main function after mocking
const { run } = await import('../../src/secrets/main.js')

describe('secrets main.ts', () => {
  const mockApiKey = 'test-api-key'
  const mockApiUrl = 'https://api.example.com'
  const mockSecretName = 'database-password'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('run function', () => {
    describe('With provided secret_id', () => {
      const mockSecretId = '789'
      beforeEach(() => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            secret_name: mockSecretName,
            secret_id: mockSecretId
          }
          return inputs[name] || ''
        })
      })

      it('updates existing secret when changes are detected', async () => {
        const mockSecretResponse: GetSecretResponse = {
          id: 789,
          name: mockSecretName,
          app_count: 0,
          comment: 'Test secret',
          secret_slots: [{ slot: 0, value: 'encrypted-value' }]
        }
        const mockSecretResource: SecretResource = {
          name: mockSecretName,
          comment: 'Test secret updated comment',
          secret_slots: [{ slot: 3, value: 'new-value' }]
        }
        const mockFilteredResource: SecretResource = {
          name: mockSecretName,
          comment: 'Test secret updated comment',
          secret_slots: [
            { slot: 3, value: 'new-value' },
            { slot: 0 } // Marked for deletion
          ]
        }
        const mockUpdatedSecret: UpdateSecretResponse = {
          id: 789,
          name: mockSecretName,
          comment: 'Test secret updated comment',
          app_count: 0,
          secret_slots: [{ slot: 3, value: 'encrypted-value' }]
        }

        mockGetSecret.mockImplementation(() => mockSecretResponse)
        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockFilterSecretSlots.mockReturnValue(mockFilteredResource)
        mockIsUpdateNeeded.mockReturnValue(true)
        mockUpdateSecret.mockImplementation(() => mockUpdatedSecret)

        await run()

        expect(mockGetSecret).toHaveBeenCalledWith(mockSecretId)
        expect(mockFilterSecretSlots).toHaveBeenCalledWith(
          mockSecretResource,
          mockSecretResponse
        )
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          mockFilteredResource,
          mockSecretResponse
        )
        expect(mockUpdateSecret).toHaveBeenCalledWith({
          ...mockFilteredResource,
          id: mockSecretResponse.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Secret updated with ID: ${mockUpdatedSecret.id}`
        )
        expect(mockSetOutput).toHaveBeenCalledWith(
          'secret_id',
          mockUpdatedSecret.id
        )
      })

      it('skips update when no changes are detected', async () => {
        const mockSecretResponse: GetSecretResponse = {
          id: 789,
          name: mockSecretName,
          app_count: 0,
          comment: 'Test secret',
          secret_slots: [{ slot: 0, value: 'encrypted-value' }]
        }
        const mockSecretResource: SecretResource = {
          name: mockSecretName,
          comment: 'Test secret',
          secret_slots: [{ slot: 0, value: 'unchanged-value' }]
        }
        const mockFilteredResource: SecretResource = {
          name: mockSecretName,
          comment: 'Test secret',
          secret_slots: [] // No changes after filtering
        }

        mockGetSecret.mockImplementation(() => mockSecretResponse)
        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockFilterSecretSlots.mockReturnValue(mockFilteredResource)
        mockIsUpdateNeeded.mockReturnValue(false) // No update needed

        await run()

        expect(mockGetSecret).toHaveBeenCalledWith(mockSecretId)
        expect(mockFilterSecretSlots).toHaveBeenCalledWith(
          mockSecretResource,
          mockSecretResponse
        )
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          mockFilteredResource,
          mockSecretResponse
        )
        expect(mockUpdateSecret).not.toHaveBeenCalled() // Update should not be called
        expect(mockInfo).toHaveBeenCalledWith(
          'No updates needed for the secret.'
        )
        expect(mockSetOutput).toHaveBeenCalledWith(
          'secret_id',
          mockSecretResponse.id
        )
        expect(mockNotice).not.toHaveBeenCalled() // No update notice
      })

      it('handles error when secret lookup fails', async () => {
        const mockError = new Error('Secret not found')

        mockGetSecret.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })
    })

    describe('without a provided secret_id - OLD', () => {
      beforeEach(() => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            secret_name: mockSecretName
          }
          return inputs[name] || ''
        })
      })

      it('updates existing secret by name when changes are detected', async () => {
        const mockSecretResponse: GetSecretResponse = {
          id: 789,
          name: mockSecretName,
          app_count: 1,
          comment: 'Existing secret',
          secret_slots: [{ slot: 0, value: 'existing-value' }]
        }
        const mockSecretResource: SecretResource = {
          name: mockSecretName,
          comment: 'Updated comment',
          secret_slots: [{ slot: 0, value: 'updated-value' }]
        }
        const mockFilteredResource: SecretResource = {
          name: mockSecretName,
          comment: 'Updated comment',
          secret_slots: [{ slot: 0, value: 'updated-value' }]
        }
        const mockUpdatedSecret: UpdateSecretResponse = {
          id: 789,
          name: mockSecretName,
          comment: 'Updated comment',
          app_count: 1,
          secret_slots: [{ slot: 0, value: 'updated-value' }]
        }

        // getSecretByName now returns the full secret response directly
        mockGetSecretByName.mockImplementation(() => mockSecretResponse)
        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockFilterSecretSlots.mockReturnValue(mockFilteredResource)
        mockIsUpdateNeeded.mockReturnValue(true) // Update is needed
        mockUpdateSecret.mockImplementation(() => mockUpdatedSecret)

        await run()

        expect(mockGetSecretByName).toHaveBeenCalledWith(mockSecretName)
        expect(mockFilterSecretSlots).toHaveBeenCalledWith(
          mockSecretResource,
          mockSecretResponse
        )
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          mockFilteredResource,
          mockSecretResponse
        )
        expect(mockUpdateSecret).toHaveBeenCalledWith({
          ...mockFilteredResource,
          id: mockSecretResponse.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Secret updated with ID: ${mockUpdatedSecret.id}`
        )
        expect(mockSetOutput).toHaveBeenCalledWith(
          'secret_id',
          mockUpdatedSecret.id
        )
      })

      it('skips update when existing secret by name has no changes', async () => {
        const mockSecretResponse: GetSecretResponse = {
          id: 789,
          name: mockSecretName,
          app_count: 1,
          comment: 'Existing secret',
          secret_slots: [{ slot: 0, value: 'existing-value' }]
        }
        const mockSecretResource: SecretResource = {
          name: mockSecretName,
          comment: 'Existing secret',
          secret_slots: [{ slot: 0, value: 'unchanged-value' }]
        }
        const mockFilteredResource: SecretResource = {
          name: mockSecretName,
          comment: 'Existing secret',
          secret_slots: [] // No changes after filtering
        }

        mockGetSecretByName.mockImplementation(() => mockSecretResponse)
        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockFilterSecretSlots.mockReturnValue(mockFilteredResource)
        mockIsUpdateNeeded.mockReturnValue(false) // No update needed

        await run()

        expect(mockGetSecretByName).toHaveBeenCalledWith(mockSecretName)
        expect(mockFilterSecretSlots).toHaveBeenCalledWith(
          mockSecretResource,
          mockSecretResponse
        )
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          mockFilteredResource,
          mockSecretResponse
        )
        expect(mockUpdateSecret).not.toHaveBeenCalled() // Update should not be called
        expect(mockInfo).toHaveBeenCalledWith(
          'No updates needed for the secret.'
        )
        expect(mockSetOutput).toHaveBeenCalledWith(
          'secret_id',
          mockSecretResponse.id
        )
        expect(mockNotice).not.toHaveBeenCalled() // No update notice
      })

      it('creates new secret when no existing secret found', async () => {
        const mockSecretResource: SecretResource = {
          name: mockSecretName,
          comment: 'new secret',
          secret_slots: [{ slot: 0, value: 'new-secret-value' }]
        }
        const mockCreatedSecret: CreateSecretResponse = {
          id: 456,
          name: mockSecretName,
          comment: 'new secret',
          app_count: 0,
          secret_slots: [{ slot: 0, value: 'new-secret-value' }]
        }

        mockGetSecretByName.mockImplementation(() => {
          throw new Error('Not found')
        })
        mockCreateSecretResourceFromInputs.mockImplementation(
          () => mockSecretResource
        )
        mockCreateSecret.mockImplementation(() => mockCreatedSecret)

        await run()

        expect(mockGetSecretByName).toHaveBeenCalledWith(mockSecretName)
        expect(mockCreateSecret).toHaveBeenCalledWith(mockSecretResource)
        expect(mockNotice).toHaveBeenCalledWith(
          `Secret created with ID: ${mockCreatedSecret.id}`
        )
        expect(mockSetOutput).toHaveBeenCalledWith(
          'secret_id',
          mockCreatedSecret.id
        )
        expect(mockIsUpdateNeeded).not.toHaveBeenCalled() // Should not be called for new secrets
        expect(mockFilterSecretSlots).not.toHaveBeenCalled() // Should not be called for new secrets
      })

      it('handles error when secret update fails even when update is needed', async () => {
        const mockSecretResponse: GetSecretResponse = {
          id: 789,
          name: mockSecretName,
          app_count: 1,
          comment: 'Existing secret',
          secret_slots: [{ slot: 0, value: 'existing-value' }]
        }
        const mockSecretResource: SecretResource = {
          name: mockSecretName,
          comment: 'Updated comment',
          secret_slots: [{ slot: 0, value: 'updated-value' }]
        }
        const mockFilteredResource: SecretResource = {
          name: mockSecretName,
          comment: 'Updated comment',
          secret_slots: [{ slot: 0, value: 'updated-value' }]
        }
        const mockError = new Error('Update failed')

        mockGetSecretByName.mockImplementation(() => mockSecretResponse)
        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockFilterSecretSlots.mockReturnValue(mockFilteredResource)
        mockIsUpdateNeeded.mockReturnValue(true) // Update is needed
        mockUpdateSecret.mockImplementation(() => {
          throw mockError
        }) // But update fails

        await run()

        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          mockFilteredResource,
          mockSecretResponse
        )
        expect(mockUpdateSecret).toHaveBeenCalledWith({
          ...mockFilteredResource,
          id: mockSecretResponse.id
        })
        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })

      it('handles error when secret creation fails', async () => {
        const mockSecretResource = {
          name: mockSecretName,
          secret_slots: [{ slot: 0, value: 'value' }]
        }
        const mockError = new Error('Creation failed')

        mockGetSecretByName.mockImplementation(() => {
          throw new Error('Not found')
        })
        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockCreateSecret.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })

      it('handles error when secret update fails', async () => {
        const mockSecret = {
          id: 789,
          name: mockSecretName,
          description: 'Test secret',
          slots: [{ slot: '0', value: 'existing-value' }]
        }
        const mockSecretResource = {
          name: mockSecretName,
          secret_slots: [{ slot: 0, value: 'updated-value' }]
        }
        const mockFilteredResource = {
          name: mockSecretName,
          secret_slots: [{ slot: 0, value: 'updated-value' }]
        }
        const mockError = new Error('Update failed')

        mockGetSecretByName.mockImplementation(() => mockSecret)
        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockFilterSecretSlots.mockReturnValue(mockFilteredResource)
        mockUpdateSecret.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })

      it('processes secret with multiple slots correctly', async () => {
        const mockSecretResponse: GetSecretResponse = {
          id: 789,
          name: mockSecretName,
          app_count: 1,
          comment: 'Multi-slot secret',
          secret_slots: [
            { slot: 0, value: 'existing-value-0' },
            { slot: 2, value: 'existing-value-2' }
          ]
        }
        const mockSecretResource: SecretResource = {
          name: mockSecretName,
          comment: 'Multi-slot secret updated',
          secret_slots: [
            { slot: 0, value: 'updated-value-0' },
            { slot: 1, value: 'new-value-1' },
            { slot: 3, value: 'new-value-3' }
          ]
        }
        const mockFilteredResource: SecretResource = {
          name: mockSecretName,
          comment: 'Multi-slot secret updated',
          secret_slots: [
            { slot: 0, value: 'updated-value-0' },
            { slot: 1, value: 'new-value-1' },
            { slot: 2 }, // Marked for deletion
            { slot: 3, value: 'new-value-3' }
          ]
        }
        const mockUpdatedSecret: UpdateSecretResponse = {
          id: 789,
          name: mockSecretName,
          comment: 'Multi-slot secret updated',
          app_count: 1,
          secret_slots: [
            { slot: 0, value: 'updated-value-0' },
            { slot: 1, value: 'new-value-1' },
            { slot: 3, value: 'new-value-3' }
          ]
        }

        mockGetSecretByName.mockImplementation(() => mockSecretResponse)
        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockFilterSecretSlots.mockReturnValue(mockFilteredResource)
        mockIsUpdateNeeded.mockReturnValue(true)
        mockUpdateSecret.mockImplementation(() => mockUpdatedSecret)

        await run()

        expect(mockGetSecretByName).toHaveBeenCalledWith(mockSecretName)
        expect(mockFilterSecretSlots).toHaveBeenCalledWith(
          mockSecretResource,
          mockSecretResponse
        )
        expect(mockUpdateSecret).toHaveBeenCalledWith({
          ...mockFilteredResource,
          id: mockSecretResponse.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Secret updated with ID: ${mockUpdatedSecret.id}`
        )
      })
    })

    describe('Error handling', () => {
      it('handles missing API key input', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: '', // Empty API key
            api_url: mockApiUrl,
            secret_name: mockSecretName,
            secret_id: '0'
          }
          return inputs[name] || ''
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'Mandatory inputs are missing: api_key, api_url, secret_name'
          )
        )
      })

      it('handles missing API URL input', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: '', // Empty API URL
            secret_name: mockSecretName,
            secret_id: '0'
          }
          return inputs[name] || ''
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'Mandatory inputs are missing: api_key, api_url, secret_name'
          )
        )
      })

      it('handles missing secret_name input', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            secret_name: '', // Empty secret name
            secret_id: '0'
          }
          return inputs[name] || ''
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'Mandatory inputs are missing: api_key, api_url, secret_name'
          )
        )
      })

      it('handles empty secret_slots and no secret provided', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            secret_name: mockSecretName,
            secret_id: '0'
          }
          return inputs[name] || ''
        })

        const mockSecretResourceWithoutSlots = {
          name: mockSecretName,
          secret_slots: [] // Empty slots
        }

        mockCreateSecretResourceFromInputs.mockReturnValue(
          mockSecretResourceWithoutSlots
        )

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'You must provide a "secret" value or a "secret_slots" string with at least one slot.'
          )
        )
      })

      it('handles secret not found and no secret_name provided', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            secret_name: '',
            secret_id: '999'
          }
          return inputs[name] || ''
        })

        const mockSecretResource = {
          name: '',
          secret_slots: [{ slot: 0, value: 'value' }]
        }

        mockCreateSecretResourceFromInputs.mockReturnValue(mockSecretResource)
        mockGetSecret.mockImplementation(() => {
          throw new Error('Not found')
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'Mandatory inputs are missing: api_key, api_url, secret_name'
          )
        )
      })
    })
  })
})
