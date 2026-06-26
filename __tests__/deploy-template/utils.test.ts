import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const mockGetInput = jest.fn<(name: string) => string>()
const mockWarning = jest.fn()

jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  warning: mockWarning,
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn()
}))

await import('@actions/core')

const {
  createTemplateResourceFromInputs,
  hasWasmBinaryChanged,
  parseParamsInput
} = await import('../../src/deploy-template/utils.js')

const defaultInputs: Record<string, string> = {
  template_name: 'my-template',
  short_descr: 'A description',
  long_descr: '',
  params: '[]',
  wasm_file: './public/test.wasm'
}

describe('parseParamsInput', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns empty array for default empty input', () => {
    mockGetInput.mockReturnValue('[]')
    expect(parseParamsInput()).toEqual([])
  })

  it('returns empty array for empty string (falls back to default)', () => {
    mockGetInput.mockReturnValue('')
    expect(parseParamsInput()).toEqual([])
  })

  it('parses a valid params array', () => {
    const params = [
      {
        name: 'DEFAULT',
        data_type: 'string',
        descr: 'Default URL',
        mandatory: true,
        metadata: ''
      }
    ]
    mockGetInput.mockReturnValue(JSON.stringify(params))
    expect(parseParamsInput()).toEqual(params)
  })

  it('parses params with enum metadata', () => {
    const params = [
      {
        name: 'THEME',
        data_type: 'enum',
        descr: '',
        mandatory: false,
        metadata:
          '{"enum_values":[{"value":"dark","label":"Dark"}],"default_value":"dark"}'
      }
    ]
    mockGetInput.mockReturnValue(JSON.stringify(params))
    expect(parseParamsInput()).toEqual(params)
  })

  it('warns and returns empty array for invalid JSON', () => {
    mockGetInput.mockReturnValue('{not valid json')
    const result = parseParamsInput()
    expect(result).toEqual([])
    expect(mockWarning).toHaveBeenCalledWith(
      'Failed to parse "params" as JSON. Using empty array.'
    )
  })

  it('warns and returns empty array when input is not an array', () => {
    mockGetInput.mockReturnValue('{"key":"value"}')
    const result = parseParamsInput()
    expect(result).toEqual([])
    expect(mockWarning).toHaveBeenCalledWith(
      'Input "params" is not a valid JSON array. Using empty array.'
    )
  })
})

describe('createTemplateResourceFromInputs', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockGetInput.mockImplementation((name: string) => defaultInputs[name] ?? '')
  })

  it('returns correct resource with all inputs', () => {
    const result = createTemplateResourceFromInputs()
    expect(result).toEqual({
      name: 'my-template',
      short_descr: 'A description',
      long_descr: '',
      owned: true,
      params: []
    })
  })

  it('always sets owned to true', () => {
    const result = createTemplateResourceFromInputs()
    expect(result.owned).toBe(true)
  })

  it('uses empty string for missing short_descr', () => {
    mockGetInput.mockImplementation((name: string) =>
      name === 'short_descr' ? '' : (defaultInputs[name] ?? '')
    )
    const result = createTemplateResourceFromInputs()
    expect(result.short_descr).toBe('')
  })

  it('includes parsed params', () => {
    const params = [
      {
        name: 'KEY',
        data_type: 'string',
        descr: 'A key',
        mandatory: true,
        metadata: ''
      }
    ]
    mockGetInput.mockImplementation((name: string) =>
      name === 'params' ? JSON.stringify(params) : (defaultInputs[name] ?? '')
    )
    const result = createTemplateResourceFromInputs()
    expect(result.params).toEqual(params)
  })
})

describe('hasWasmBinaryChanged', () => {
  const mockWasmPath = '/path/to/test.wasm'
  const mockWasmBuffer = Buffer.from('mock wasm binary content')
  const expectedChecksum = crypto
    .createHash('md5')
    .update(mockWasmBuffer)
    .digest('hex')

  beforeEach(() => {
    jest.resetAllMocks()
    mockGetInput.mockReturnValue(mockWasmPath)
    jest.spyOn(path, 'normalize').mockReturnValue(mockWasmPath)
    jest.spyOn(fs, 'readFileSync').mockReturnValue(mockWasmBuffer)
  })

  it('returns false when checksums match', () => {
    expect(hasWasmBinaryChanged(expectedChecksum)).toBe(false)
  })

  it('returns true when checksums differ', () => {
    expect(hasWasmBinaryChanged('different-checksum')).toBe(true)
  })

  it('reads wasm_file input for the path', () => {
    hasWasmBinaryChanged(expectedChecksum)
    expect(mockGetInput).toHaveBeenCalledWith('wasm_file')
  })

  it('throws when file cannot be read', () => {
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('File not found')
    })
    expect(() => hasWasmBinaryChanged('any')).toThrow('File not found')
  })
})
