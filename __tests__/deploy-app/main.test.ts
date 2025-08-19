import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Create mock functions before mocking modules
const mockGetInput = jest.fn<(name: string) => string>()
const mockSetOutput = jest.fn()
const mockSetFailed = jest.fn()
const mockNotice = jest.fn()
const mockDebug = jest.fn()
const mockInfo = jest.fn()

const mockCreateAppResourceFromInputs = jest.fn()
const mockHasWasmBinaryChanged = jest.fn()

const mockIsUpdateNeeded = jest.fn()

const mockGetApps = jest.fn()
const mockGetApp = jest.fn()
const mockGetAppByName = jest.fn()
const mockCreateApp = jest.fn()
const mockUpdateApp = jest.fn()
const mockUploadBinary = jest.fn()
const mockGetBinary = jest.fn()

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

jest.unstable_mockModule('../../src/deploy-app/utils.js', () => ({
  createAppResourceFromInputs: mockCreateAppResourceFromInputs,
  hasWasmBinaryChanged: mockHasWasmBinaryChanged
}))

jest.unstable_mockModule('../../src/deploy-app/changes.js', () => ({
  isUpdateNeeded: mockIsUpdateNeeded
}))

// Mock FastEdgeClient
jest.unstable_mockModule('../../src/api-utils/index.js', () => ({
  FastEdgeClient: jest.fn().mockImplementation(() => ({
    apps: {
      getAll: mockGetApps,
      get: mockGetApp,
      getByName: mockGetAppByName,
      create: mockCreateApp,
      update: mockUpdateApp
    },
    binaries: {
      upload: mockUploadBinary,
      get: mockGetBinary
    }
  }))
}))

// Import the main function after mocking
const { run } = await import('../../src/deploy-app/main.js')

describe('main.ts', () => {
  const mockApiKey = 'test-api-key'
  const mockApiUrl = 'https://api.example.com'
  const mockWasmFile = './test.wasm'
  const mockAppName = 'test-app'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('run function', () => {
    describe('With provided app_id', () => {
      const mockAppId = '789'
      beforeEach(() => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            wasm_file: mockWasmFile,
            app_name: mockAppName,
            app_id: mockAppId
          }
          return inputs[name] || ''
        })
      })

      it('updates existing app by ID when changes are detected', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' },
          env: { NODE_ENV: 'development' },
          comment: 'Original comment'
        }
        const mockAppResource = {
          id: 789,
          name: mockAppName,
          binary: 123,
          env: { NODE_ENV: 'production' },
          comment: 'Updated comment'
        }
        const mockUpdatedApp = {
          id: 789,
          name: mockAppName,
          binary: 123,
          env: { NODE_ENV: 'production' },
          comment: 'Updated comment'
        }

        const mockGetAppChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetApp.mockReturnValue(mockGetAppChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockIsUpdateNeeded.mockReturnValue(true) // Changes detected
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockGetApp).toHaveBeenCalledWith(mockAppId)
        expect(mockGetAppChain.includeBinary).toHaveBeenCalled()
        expect(mockHasWasmBinaryChanged).toHaveBeenCalledWith(
          mockApp.binary.checksum
        )
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          {
            ...mockAppResource,
            binary: mockApp.binary.id,
            id: mockApp.id
          },
          mockApp
        )
        expect(mockUpdateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockApp.binary.id,
          id: mockApp.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Application updated with ID: ${mockUpdatedApp.id}`
        )
        expect(mockSetOutput).toHaveBeenCalledWith('app_id', mockUpdatedApp.id)
        expect(mockSetOutput).toHaveBeenCalledWith(
          'binary_id',
          mockUpdatedApp.binary
        )
      })

      it('skips update when no changes are detected', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' },
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }
        const mockAppResource = {
          id: 789,
          name: mockAppName,
          binary: 123,
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }

        const mockGetAppChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetApp.mockReturnValue(mockGetAppChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockIsUpdateNeeded.mockReturnValue(false) // No changes detected

        await run()

        expect(mockGetApp).toHaveBeenCalledWith(mockAppId)
        expect(mockGetAppChain.includeBinary).toHaveBeenCalled()
        expect(mockHasWasmBinaryChanged).toHaveBeenCalledWith(
          mockApp.binary.checksum
        )
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          {
            ...mockAppResource,
            binary: mockApp.binary.id,
            id: mockApp.id
          },
          mockApp
        )
        expect(mockUpdateApp).not.toHaveBeenCalled() // Update should not be called
        expect(mockInfo).toHaveBeenCalledWith(
          'No changes detected, skipping update.'
        )
        expect(mockSetOutput).toHaveBeenCalledWith('app_id', mockApp.id)
        expect(mockSetOutput).toHaveBeenCalledWith(
          'binary_id',
          mockApp.binary.id
        )
        expect(mockNotice).not.toHaveBeenCalled() // No update notice
      })

      it('updates app when binary has changed even if other fields are same', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'old-checksum' },
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }
        const mockNewBinary = { id: 456, checksum: 'new-checksum' }
        const mockAppResource = {
          id: 789,
          name: mockAppName,
          binary: 456,
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }
        const mockUpdatedApp = {
          id: 789,
          name: mockAppName,
          binary: 456,
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }

        const mockGetAppChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetApp.mockReturnValue(mockGetAppChain)
        mockHasWasmBinaryChanged.mockReturnValue(true) // Binary changed
        mockUploadBinary.mockImplementation(() => mockNewBinary)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockIsUpdateNeeded.mockReturnValue(true) // Changes detected due to binary
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockDebug).toHaveBeenCalledWith(
          'Binary has changed, uploading new binary...'
        )
        expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          {
            ...mockAppResource,
            binary: mockNewBinary.id,
            id: mockApp.id
          },
          mockApp
        )
        expect(mockUpdateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockNewBinary.id,
          id: mockApp.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Application updated with ID: ${mockUpdatedApp.id}`
        )
      })

      it('handles error when app lookup fails', async () => {
        const mockError = new Error('App not found')

        mockGetApp.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })

      it('handles error when app update fails even when update is needed', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' },
          env: { NODE_ENV: 'development' },
          comment: 'Original comment'
        }
        const mockAppResource = {
          id: 789,
          name: mockAppName,
          binary: 123,
          env: { NODE_ENV: 'production' },
          comment: 'Updated comment'
        }
        const mockError = new Error('Update failed')

        const mockGetAppChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetApp.mockReturnValue(mockGetAppChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockIsUpdateNeeded.mockReturnValue(true) // Update is needed
        mockUpdateApp.mockImplementation(() => {
          throw mockError
        }) // But update fails

        await run()

        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          {
            ...mockAppResource,
            binary: mockApp.binary.id,
            id: mockApp.id
          },
          mockApp
        )
        expect(mockUpdateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockApp.binary.id,
          id: mockApp.id
        })
        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })
    })

    describe('without a provided app_id (old)', () => {
      beforeEach(() => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            wasm_file: mockWasmFile,
            app_name: mockAppName
          }
          return inputs[name] || ''
        })
      })

      it('updates existing app by name when changes are detected', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' },
          env: { NODE_ENV: 'development' },
          comment: 'Original comment'
        }
        const mockAppResource = {
          name: mockAppName,
          binary: 123,
          env: { NODE_ENV: 'production' },
          comment: 'Updated comment'
        }
        const mockUpdatedApp = {
          id: 789,
          name: mockAppName,
          binary: 123,
          env: { NODE_ENV: 'production' },
          comment: 'Updated comment'
        }

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockIsUpdateNeeded.mockReturnValue(true) // Changes detected
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockGetAppByName).toHaveBeenCalledWith(mockAppName)
        expect(mockGetAppByNameChain.includeBinary).toHaveBeenCalled()
        expect(mockInfo).toHaveBeenCalledWith(
          `Found application with name: ${mockAppName}`
        )
        expect(mockInfo).toHaveBeenCalledWith(
          `Updating application with name: ${mockAppName}`
        )
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          {
            ...mockAppResource,
            binary: mockApp.binary.id,
            id: mockApp.id
          },
          mockApp
        )
        expect(mockUpdateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockApp.binary.id,
          id: mockApp.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Application updated with ID: ${mockUpdatedApp.id}`
        )
      })

      it('skips update when existing app by name has no changes', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' },
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }
        const mockAppResource = {
          name: mockAppName,
          binary: 123,
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockIsUpdateNeeded.mockReturnValue(false) // No changes detected

        await run()

        expect(mockGetAppByName).toHaveBeenCalledWith(mockAppName)
        expect(mockGetAppByNameChain.includeBinary).toHaveBeenCalled()
        expect(mockInfo).toHaveBeenCalledWith(
          `Found application with name: ${mockAppName}`
        )
        expect(mockInfo).toHaveBeenCalledWith(
          `Updating application with name: ${mockAppName}`
        )
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          {
            ...mockAppResource,
            binary: mockApp.binary.id,
            id: mockApp.id
          },
          mockApp
        )
        expect(mockUpdateApp).not.toHaveBeenCalled() // Update should not be called
        expect(mockInfo).toHaveBeenCalledWith(
          'No changes detected, skipping update.'
        )
        expect(mockSetOutput).toHaveBeenCalledWith('app_id', mockApp.id)
        expect(mockSetOutput).toHaveBeenCalledWith(
          'binary_id',
          mockApp.binary.id
        )
        expect(mockNotice).not.toHaveBeenCalled() // No update notice
      })

      it('creates new application when no existing app found', async () => {
        const mockBinary = { id: 123, checksum: 'abc123' }
        const mockAppResource = { name: mockAppName, binary: 123 }
        const mockCreatedApp = { id: 456, name: mockAppName, binary: 123 }

        mockGetAppByName.mockImplementation(() => {
          throw new Error('Not found')
        })
        mockUploadBinary.mockImplementation(() => mockBinary)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockCreateApp.mockImplementation(() => mockCreatedApp)

        await run()

        expect(mockGetAppByName).toHaveBeenCalledWith(mockAppName)
        expect(mockInfo).toHaveBeenCalledWith(
          `Application with name "${mockAppName}" not found`
        )
        expect(mockInfo).toHaveBeenCalledWith(
          `Creating new application with name: ${mockAppName}`
        )
        expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
        expect(mockCreateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockBinary.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Application created with ID: ${mockCreatedApp.id}`
        )
        expect(mockSetOutput).toHaveBeenCalledWith('app_id', mockCreatedApp.id)
        expect(mockSetOutput).toHaveBeenCalledWith(
          'binary_id',
          mockCreatedApp.binary
        )
        expect(mockIsUpdateNeeded).not.toHaveBeenCalled() // Should not be called for new apps
      })

      it('uploads new binary when binary has changed for existing app', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'old-checksum' },
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }
        const mockNewBinary = { id: 456, checksum: 'new-checksum' }
        const mockAppResource = {
          name: mockAppName,
          binary: 456,
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }
        const mockUpdatedApp = {
          id: 789,
          name: mockAppName,
          binary: 456,
          env: { NODE_ENV: 'production' },
          comment: 'Same comment'
        }

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockHasWasmBinaryChanged.mockReturnValue(true) // Binary changed
        mockUploadBinary.mockImplementation(() => mockNewBinary)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockIsUpdateNeeded.mockReturnValue(true) // Changes detected due to binary
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockDebug).toHaveBeenCalledWith(
          'Binary has changed, uploading new binary...'
        )
        expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
        expect(mockIsUpdateNeeded).toHaveBeenCalledWith(
          {
            ...mockAppResource,
            binary: mockNewBinary.id,
            id: mockApp.id
          },
          mockApp
        )
        expect(mockUpdateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockNewBinary.id,
          id: mockApp.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Application updated with ID: ${mockUpdatedApp.id}`
        )
      })

      it('handles app without binary checksum by uploading new binary', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123 } // No checksum property
        }
        const mockNewBinary = { id: 456, checksum: 'new-checksum' }
        const mockAppResource = { name: mockAppName, binary: 456 }
        const mockUpdatedApp = { id: 789, name: mockAppName, binary: 456 }

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockUploadBinary.mockImplementation(() => mockNewBinary)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockDebug).toHaveBeenCalledWith(
          'Binary has changed, uploading new binary...'
        )
        expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
      })
      it('handles error when binary upload fails', async () => {
        const mockError = new Error('Upload failed')

        mockGetAppByName.mockImplementation(() => [])
        mockUploadBinary.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })

      it('handles error when app creation fails', async () => {
        const mockBinary = { id: 123, checksum: 'abc123' }
        const mockAppResource = { name: mockAppName, binary: 123 }
        const mockError = new Error('Creation failed')

        mockGetAppByName.mockImplementation(() => [])
        mockUploadBinary.mockImplementation(() => mockBinary)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockCreateApp.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })
      it('handles error when app update fails', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' }
        }
        const mockAppResource = { name: mockAppName, binary: 123 }
        const mockError = new Error('Update failed')

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockUpdateApp.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })
    })

    describe('Error handling', () => {
      it('handles missing API key input', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: '', // Empty API key
            api_url: mockApiUrl,
            wasm_file: mockWasmFile,
            app_name: mockAppName,
            app_id: '0'
          }
          return inputs[name] || ''
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'Mandatory inputs are missing: api_key, api_url, wasm_file'
          )
        )
      })

      it('handles missing wasm_file input', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            wasm_file: '', // Empty wasm file
            app_name: mockAppName,
            app_id: '0'
          }
          return inputs[name] || ''
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'Mandatory inputs are missing: api_key, api_url, wasm_file'
          )
        )
      })
    })
  })
})
