import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => ({
  getInput: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn()
}))

await import('@actions/core')

const {
  getTemplate,
  getTemplates,
  getTemplateByName,
  createTemplate,
  updateTemplate
} = await import('../../src/api-utils/templates/index.js')

const apiConfig = { apiKey: 'test-key', apiUrl: 'https://api.example.com' }

const mockTemplate = {
  id: 100,
  binary_id: 500,
  name: 'my-template',
  short_descr: 'Short',
  long_descr: '',
  api_type: 'wasi-http',
  owned: true,
  params: []
}

const mockTemplateShort = {
  id: 100,
  name: 'my-template',
  short_descr: 'Short',
  api_type: 'wasi-http',
  owned: true
}

function mockOkResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body)
  } as Response)
}

function mockErrorResponse(status: number, statusText: string) {
  return Promise.resolve({
    ok: false,
    status,
    statusText
  } as Response)
}

describe('getTemplate', () => {
  beforeEach(() => jest.resetAllMocks())

  it('fetches template by ID and injects id', async () => {
    const spy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockOkResponse(mockTemplate))

    const result = await getTemplate(apiConfig, 100)

    expect(spy).toHaveBeenCalledWith(
      'https://api.example.com/fastedge/v1/template/100',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.id).toBe(100)
    expect(result.binary_id).toBe(500)
  })

  it('throws on HTTP error', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockErrorResponse(404, 'Not Found'))

    await expect(getTemplate(apiConfig, 999)).rejects.toThrow(
      'Error fetching template'
    )
  })
})

describe('getTemplates', () => {
  beforeEach(() => jest.resetAllMocks())

  it('returns the templates array from the response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(() =>
        mockOkResponse({ count: 1, templates: [mockTemplateShort] })
      )

    const result = await getTemplates(apiConfig, { only_mine: true })

    expect(result).toEqual([mockTemplateShort])
  })

  it('returns empty array when templates key is missing', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockOkResponse({ count: 0 }))

    const result = await getTemplates(apiConfig)

    expect(result).toEqual([])
  })

  it('throws on HTTP error', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockErrorResponse(500, 'Server Error'))

    await expect(getTemplates(apiConfig)).rejects.toThrow(
      'Error fetching templates'
    )
  })
})

describe('getTemplateByName', () => {
  beforeEach(() => jest.resetAllMocks())

  it('finds template by name and returns full details', async () => {
    const spy = jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/template/100')) {
        return mockOkResponse(mockTemplate)
      }
      return mockOkResponse({ count: 1, templates: [mockTemplateShort] })
    })

    const result = await getTemplateByName(apiConfig, 'my-template')

    expect(result.id).toBe(100)
    expect(result.binary_id).toBe(500)
    expect(spy).toHaveBeenCalledTimes(2) // list + get-by-id
  })

  it('throws when name is not found in list', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockOkResponse({ count: 0, templates: [] }))

    await expect(getTemplateByName(apiConfig, 'missing')).rejects.toThrow(
      'Template with name "missing" not found'
    )
  })
})

describe('createTemplate', () => {
  beforeEach(() => jest.resetAllMocks())

  it('posts to the templates endpoint and returns created template', async () => {
    const spy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockOkResponse(mockTemplateShort))

    const resource = {
      binary_id: 500,
      name: 'my-template',
      short_descr: 'Short',
      long_descr: '',
      owned: true,
      params: []
    }

    const result = await createTemplate(apiConfig, resource)

    expect(spy).toHaveBeenCalledWith(
      'https://api.example.com/fastedge/v1/template',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(resource)
      })
    )
    expect(result.id).toBe(100)
  })

  it('throws on HTTP error', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockErrorResponse(400, 'Bad Request'))

    await expect(
      createTemplate(apiConfig, {
        binary_id: 500,
        name: 'x',
        owned: true,
        params: []
      })
    ).rejects.toThrow('Error creating template')
  })
})

describe('updateTemplate', () => {
  beforeEach(() => jest.resetAllMocks())

  it('puts to the correct endpoint and returns updated template with injected id', async () => {
    const spy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockOkResponse(mockTemplateShort))

    const resource = {
      id: 100,
      binary_id: 600,
      name: 'my-template',
      short_descr: 'Updated',
      long_descr: '',
      owned: true,
      params: []
    }

    const result = await updateTemplate(apiConfig, resource)

    expect(spy).toHaveBeenCalledWith(
      'https://api.example.com/fastedge/v1/template/100',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(resource) })
    )
    expect(result.id).toBe(100)
  })

  it('throws on HTTP error', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockErrorResponse(404, 'Not Found'))

    await expect(
      updateTemplate(apiConfig, {
        id: 999,
        binary_id: 500,
        name: 'x',
        owned: true,
        params: []
      })
    ).rejects.toThrow('Error updating template')
  })
})
