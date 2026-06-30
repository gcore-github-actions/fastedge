import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockGetInput = jest.fn<(name: string) => string>()
const mockSetOutput = jest.fn()
const mockSetFailed = jest.fn()
const mockNotice = jest.fn()
const mockDebug = jest.fn()
const mockInfo = jest.fn()

const mockCreateTemplateResourceFromInputs = jest.fn()
const mockHasWasmBinaryChanged = jest.fn()
const mockIsUpdateNeeded = jest.fn()

const mockGetTemplate = jest.fn()
const mockGetTemplateByName = jest.fn()
const mockCreateTemplate = jest.fn()
const mockUpdateTemplate = jest.fn()
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

jest.unstable_mockModule('../../src/deploy-template/utils.js', () => ({
  createTemplateResourceFromInputs: mockCreateTemplateResourceFromInputs,
  hasWasmBinaryChanged: mockHasWasmBinaryChanged
}))

jest.unstable_mockModule('../../src/deploy-template/changes.js', () => ({
  isUpdateNeeded: mockIsUpdateNeeded
}))

jest.unstable_mockModule('../../src/api-utils/index.js', () => ({
  FastEdgeClient: jest.fn().mockImplementation(() => ({
    templates: {
      get: mockGetTemplate,
      getByName: mockGetTemplateByName,
      create: mockCreateTemplate,
      update: mockUpdateTemplate
    },
    binaries: {
      upload: mockUploadBinary,
      get: mockGetBinary
    }
  }))
}))

const { run } = await import('../../src/deploy-template/main.js')

const mockApiKey = 'test-api-key'
const mockApiUrl = 'https://api.example.com'
const mockWasmFile = './public/test.wasm'
const mockTemplateName = 'my-template'

const baseInputs: Record<string, string> = {
  api_key: mockApiKey,
  api_url: mockApiUrl,
  wasm_file: mockWasmFile,
  template_name: mockTemplateName,
  template_id: '0'
}

const mockTemplate = {
  id: 100,
  binary_id: 500,
  name: mockTemplateName,
  short_descr: 'A description',
  long_descr: '',
  api_type: 'wasi-http',
  owned: true,
  params: []
}

const mockBinary = {
  id: 500,
  checksum: 'abc123',
  api_type: 'wasi-http',
  status: 1,
  source: 1
}

describe('run', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetInput.mockImplementation((name: string) => baseInputs[name] ?? '')
  })

  describe('create path (template not found by name)', () => {
    beforeEach(() => {
      mockGetTemplateByName.mockRejectedValue(
        new Error('Template with name "my-template" not found')
      )
      mockUploadBinary.mockResolvedValue({ id: 600 })
      mockCreateTemplateResourceFromInputs.mockReturnValue({
        name: mockTemplateName,
        short_descr: '',
        long_descr: '',
        owned: true,
        params: []
      })
      mockCreateTemplate.mockResolvedValue({ id: 101, name: mockTemplateName })
    })

    it('uploads binary and creates template', async () => {
      await run()

      expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
      expect(mockCreateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ binary_id: 600 })
      )
      expect(mockNotice).toHaveBeenCalledWith('Template created with ID: 101')
      expect(mockSetOutput).toHaveBeenCalledWith('template_id', 101)
      expect(mockSetOutput).toHaveBeenCalledWith('binary_id', 600)
    })
  })

  describe('update path (template found by name)', () => {
    beforeEach(() => {
      mockGetTemplateByName.mockResolvedValue(mockTemplate)
      mockGetBinary.mockResolvedValue(mockBinary)
      mockCreateTemplateResourceFromInputs.mockReturnValue({
        name: mockTemplateName,
        short_descr: 'A description',
        long_descr: '',
        owned: true,
        params: []
      })
    })

    it('skips binary upload when binary has not changed', async () => {
      mockHasWasmBinaryChanged.mockReturnValue(false)
      mockIsUpdateNeeded.mockReturnValue(false)

      await run()

      expect(mockUploadBinary).not.toHaveBeenCalled()
      expect(mockUpdateTemplate).not.toHaveBeenCalled()
      expect(mockInfo).toHaveBeenCalledWith(
        'No changes detected, skipping update.'
      )
      expect(mockSetOutput).toHaveBeenCalledWith('template_id', mockTemplate.id)
      expect(mockSetOutput).toHaveBeenCalledWith('binary_id', mockBinary.id)
    })

    it('uploads new binary and updates template when binary has changed', async () => {
      const newBinary = {
        id: 601,
        checksum: 'newchecksum',
        api_type: 'wasi-http',
        status: 1,
        source: 1
      }
      mockHasWasmBinaryChanged.mockReturnValue(true)
      mockUploadBinary.mockResolvedValue(newBinary)
      mockIsUpdateNeeded.mockReturnValue(true)
      mockUpdateTemplate.mockResolvedValue({ id: 100, name: mockTemplateName })

      await run()

      expect(mockDebug).toHaveBeenCalledWith(
        'Binary has changed, uploading new binary...'
      )
      expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
      expect(mockUpdateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          binary_id: newBinary.id,
          id: mockTemplate.id
        })
      )
      expect(mockNotice).toHaveBeenCalledWith('Template updated with ID: 100')
      expect(mockSetOutput).toHaveBeenCalledWith('binary_id', newBinary.id)
    })

    it('updates template metadata when only metadata has changed', async () => {
      mockHasWasmBinaryChanged.mockReturnValue(false)
      mockIsUpdateNeeded.mockReturnValue(true)
      mockUpdateTemplate.mockResolvedValue({ id: 100, name: mockTemplateName })

      await run()

      expect(mockUploadBinary).not.toHaveBeenCalled()
      expect(mockUpdateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          binary_id: mockBinary.id,
          id: mockTemplate.id
        })
      )
      expect(mockNotice).toHaveBeenCalledWith('Template updated with ID: 100')
    })

    it('uploads binary even when binary has no checksum', async () => {
      mockGetBinary.mockResolvedValue({
        id: 500,
        api_type: 'wasi-http',
        status: 1,
        source: 1
      }) // no checksum
      mockUploadBinary.mockResolvedValue({ id: 601 })
      mockIsUpdateNeeded.mockReturnValue(true)
      mockUpdateTemplate.mockResolvedValue({ id: 100, name: mockTemplateName })

      await run()

      expect(mockDebug).toHaveBeenCalledWith(
        'Binary has changed, uploading new binary...'
      )
      expect(mockUploadBinary).toHaveBeenCalled()
    })
  })

  describe('lookup by template_id', () => {
    it('fetches by ID when template_id is non-zero', async () => {
      mockGetInput.mockImplementation(
        (name: string) =>
          ({
            ...baseInputs,
            template_id: '100'
          })[name] ?? ''
      )
      mockGetTemplate.mockResolvedValue(mockTemplate)
      mockGetBinary.mockResolvedValue(mockBinary)
      mockHasWasmBinaryChanged.mockReturnValue(false)
      mockIsUpdateNeeded.mockReturnValue(false)
      mockCreateTemplateResourceFromInputs.mockReturnValue({
        name: mockTemplateName,
        short_descr: '',
        long_descr: '',
        owned: true,
        params: []
      })

      await run()

      expect(mockGetTemplate).toHaveBeenCalledWith('100')
      expect(mockGetTemplateByName).not.toHaveBeenCalled()
      expect(mockInfo).toHaveBeenCalledWith('Found template with ID: 100')
    })
  })

  describe('error handling', () => {
    it('fails when api_key is missing', async () => {
      mockGetInput.mockImplementation((name: string) =>
        name === 'api_key' ? '' : (baseInputs[name] ?? '')
      )

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Mandatory inputs are missing')
      )
    })

    it('fails when template_name is missing', async () => {
      mockGetInput.mockImplementation((name: string) =>
        name === 'template_name' ? '' : (baseInputs[name] ?? '')
      )

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Mandatory inputs are missing')
      )
    })

    it('fails when binary upload throws', async () => {
      mockGetTemplateByName.mockRejectedValue(new Error('not found'))
      mockUploadBinary.mockRejectedValue(new Error('Upload failed'))
      mockCreateTemplateResourceFromInputs.mockReturnValue({
        name: mockTemplateName,
        short_descr: '',
        long_descr: '',
        owned: true,
        params: []
      })

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('Upload failed')
    })

    it('fails when template creation throws', async () => {
      mockGetTemplateByName.mockRejectedValue(new Error('not found'))
      mockUploadBinary.mockResolvedValue({ id: 600 })
      mockCreateTemplateResourceFromInputs.mockReturnValue({
        name: mockTemplateName,
        short_descr: '',
        long_descr: '',
        owned: true,
        params: []
      })
      mockCreateTemplate.mockRejectedValue(new Error('Creation failed'))

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('Creation failed')
    })

    it('fails when template update throws', async () => {
      mockGetTemplateByName.mockResolvedValue(mockTemplate)
      mockGetBinary.mockResolvedValue(mockBinary)
      mockHasWasmBinaryChanged.mockReturnValue(false)
      mockIsUpdateNeeded.mockReturnValue(true)
      mockCreateTemplateResourceFromInputs.mockReturnValue({
        name: mockTemplateName,
        short_descr: '',
        long_descr: '',
        owned: true,
        params: []
      })
      mockUpdateTemplate.mockRejectedValue(new Error('Update failed'))

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('Update failed')
    })
  })
})
