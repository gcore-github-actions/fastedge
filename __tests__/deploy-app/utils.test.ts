import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// jest.unstable_mockModule('@actions/core', () => core)

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

const { createAppResourceFromInputs, hasWasmBinaryChanged } = await import(
  '../../src/deploy-app/utils.js'
)

describe('Utils functions', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })
  describe('createAppResourceFromInputs', () => {
    it('creates app resource with all valid inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'test-app',
          comment: 'Test application deployment',
          env: '{"ENVIRONMENT": "production", "LOG_LEVEL": "info"}',
          rsp_headers:
            '{"Content-Type": "application/json", "Cache-Control": "no-cache"}',
          secrets: '{"API_KEY": 1}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'test-app',
        status: 1,
        comment: 'Test application deployment',
        env: {
          ENVIRONMENT: 'production',
          LOG_LEVEL: 'info'
        },
        rsp_headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        secrets: {
          API_KEY: { id: 1 }
        }
      })
    })

    it('creates app resource with minimal inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        return name === 'app_name' ? 'minimal-app' : ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'minimal-app',
        comment: '',
        status: 1,
        env: {},
        rsp_headers: {},
        secrets: {}
      })
    })

    it('handles empty JSON inputs gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'empty-json-app',
          comment: '',
          env: '{}',
          rsp_headers: '{}',
          secrets: '{}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'empty-json-app',
        comment: '',
        status: 1,
        env: {},
        rsp_headers: {},
        secrets: {}
      })
    })

    it('handles invalid JSON in env input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-json-app',
          comment: 'Test comment',
          env: 'invalid json string',
          rsp_headers: '{"valid": "json"}',
          secrets: '{}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-json-app',
        comment: 'Test comment',
        status: 1,
        env: {},
        rsp_headers: { valid: 'json' },
        secrets: {}
      })
    })

    it('handles invalid JSON in rsp_headers input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{invalid json}',
          comment: '',
          secrets: '{}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: {}
      })
    })

    it('handles invalid JSON in secrets input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{"Content-Type": "application/json"}',
          comment: '',
          secrets: '{invalid json}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: { 'Content-Type': 'application/json' },
        comment: '',
        secrets: {}
      })
      // expect(mockWarning).toHaveBeenCalledWith(
      //   'Failed to parse input as JSON: secrets. Using empty object instead.'
      // )
    })

    it('handles invalid dictionary structure in secrets input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{}',
          comment: '',
          secrets: '{"database-password": "some_secret_password}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: {}
      })
    })

    it('handles invalid secrets structure in secrets input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{}',
          comment: '',
          secrets: '{"database-password": {"id": "123"}}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: {}
      })
    })

    it('handles correct secret structure in secrets input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{}',
          comment: '',
          secrets: '{"database-password":123 }'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: { 'database-password': { id: 123 } }
      })
    })

    it('handles whitespace-only JSON inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'whitespace-app',
          env: '   ',
          rsp_headers: '\t\n  ',
          comment: 'Whitespace test',
          secrets: '\t\n  '
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'whitespace-app',
        status: 1,
        env: {},
        rsp_headers: {},
        comment: 'Whitespace test',
        secrets: {}
      })
    })

    it('handles complex nested JSON structures', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'complex-app',
          env: '{"DATABASE": "postgresql://localhost", "FEATURES": "auth,logging"}',
          rsp_headers:
            '{"X-Custom": "value", "Access-Control-Allow-Origin": "*"}',
          comment: 'Complex configuration test',
          secrets: '{}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'complex-app',
        status: 1,
        env: {
          DATABASE: 'postgresql://localhost',
          FEATURES: 'auth,logging'
        },
        rsp_headers: {
          'X-Custom': 'value',
          'Access-Control-Allow-Origin': '*'
        },
        comment: 'Complex configuration test',
        secrets: {}
      })
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
      mockGetInput.mockImplementation(() => mockWasmPath)
      jest.spyOn(path, 'normalize').mockReturnValue(mockWasmPath)
      jest.spyOn(fs, 'readFileSync').mockReturnValue(mockWasmBuffer)
    })

    it('returns false when checksums match', () => {
      const result = hasWasmBinaryChanged(expectedChecksum)

      expect(result).toBe(false)
      expect(mockGetInput).toHaveBeenCalledWith('wasm_file')
      expect(path.normalize).toHaveBeenCalledWith(mockWasmPath)
      expect(fs.readFileSync).toHaveBeenCalledWith(mockWasmPath)
    })

    it('returns true when checksums do not match', () => {
      const differentChecksum = 'different-checksum-value'

      const result = hasWasmBinaryChanged(differentChecksum)

      expect(result).toBe(true)
      expect(mockGetInput).toHaveBeenCalledWith('wasm_file')
      expect(path.normalize).toHaveBeenCalledWith(mockWasmPath)
      expect(fs.readFileSync).toHaveBeenCalledWith(mockWasmPath)
    })

    it('handles different file paths correctly', () => {
      const differentPath = '/different/path/app.wasm'
      const normalizedPath = '/normalized/different/path/app.wasm'

      mockGetInput.mockImplementation(() => differentPath)
      jest.spyOn(path, 'normalize').mockReturnValue(normalizedPath)

      hasWasmBinaryChanged('some-checksum')

      expect(mockGetInput).toHaveBeenCalledWith('wasm_file')
      expect(path.normalize).toHaveBeenCalledWith(differentPath)
      expect(fs.readFileSync).toHaveBeenCalledWith(normalizedPath)
    })

    it('handles relative paths through normalization', () => {
      const relativePath = './src/../dist/app.wasm'
      const normalizedPath = 'dist/app.wasm'

      mockGetInput.mockImplementation(() => relativePath)
      jest.spyOn(path, 'normalize').mockReturnValue(normalizedPath)

      hasWasmBinaryChanged('some-checksum')

      expect(path.normalize).toHaveBeenCalledWith(relativePath)
      expect(fs.readFileSync).toHaveBeenCalledWith(normalizedPath)
    })

    it('generates consistent checksums for identical content', () => {
      const identicalBuffer = Buffer.from('mock wasm binary content')
      jest.spyOn(fs, 'readFileSync').mockReturnValue(identicalBuffer)

      const result1 = hasWasmBinaryChanged('different-checksum')
      const result2 = hasWasmBinaryChanged('different-checksum')

      expect(result1).toBe(result2)
      expect(result1).toBe(true)
    })

    it('throws error when file cannot be read', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found')
      })

      expect(() => hasWasmBinaryChanged('some-checksum')).toThrow(
        'File not found'
      )
    })

    it('handles empty file content', () => {
      const emptyBuffer = Buffer.alloc(0)
      const emptyChecksum = crypto
        .createHash('md5')
        .update(emptyBuffer)
        .digest('hex')

      jest.spyOn(fs, 'readFileSync').mockReturnValue(emptyBuffer)

      const result = hasWasmBinaryChanged(emptyChecksum)

      expect(result).toBe(false)
    })

    it('handles binary content with special characters', () => {
      const binaryBuffer = Buffer.from([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00
      ]) // WASM magic number
      const binaryChecksum = crypto
        .createHash('md5')
        .update(binaryBuffer)
        .digest('hex')

      jest.spyOn(fs, 'readFileSync').mockReturnValue(binaryBuffer)

      const result = hasWasmBinaryChanged(binaryChecksum)

      expect(result).toBe(false)
    })
  })

  describe('parseDictionaryInput', () => {
    it('parses valid dictionary input correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: JSON.stringify({
            NODE_ENV: 'production',
            API_URL: 'https://api.example.com',
            DEBUG: 'false'
          })
        }
        return inputs[name] || ''
      })

      // Access the function via createAppResourceFromInputs result
      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com',
        DEBUG: 'false'
      })
    })

    it('handles non-string values and converts to string', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers: JSON.stringify({
            'Content-Type': 'application/json',
            'Cache-Control': 3600, // Non-string value
            'X-Custom-Header': true // Non-string value
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({
        'Content-Type': 'application/json',
        'Cache-Control': '3600',
        'X-Custom-Header': 'true'
      })
    })

    it('handles non-stringable values and converts to empty string', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers: JSON.stringify({
            'Content-Type': 'application/json',
            'Cache-Control': {}, // Non-stringable value
            'X-Custom-Header': [] // Non-stringable value
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({
        'Content-Type': 'application/json',
        'Cache-Control': '',
        'X-Custom-Header': ''
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "Cache-Control" in input "rsp_headers" is not string compatible.'
      )
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "X-Custom-Header" in input "rsp_headers" is not string compatible.'
      )
    })

    it('handles non-object input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"not an object"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "env" is not a valid JSON dictionary object.'
      )
    })

    it('handles array input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers: JSON.stringify(['not', 'an', 'object'])
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "rsp_headers" is not a valid JSON dictionary object.'
      )
    })

    it('handles null input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'null'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "env" is not a valid JSON dictionary object.'
      )
    })

    it('handles empty input by using default empty object', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: ''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
    })

    it('handles mixed valid and invalid values correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: JSON.stringify({
            VALID_STRING: 'correct',
            VALID_NUMBER: 123,
            ANOTHER_VALID: 'also correct',
            INVALID_OBJECT: { nested: 'object' },
            INVALID_ARRAY: [1, 2, 3]
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        VALID_STRING: 'correct',
        VALID_NUMBER: '123',
        ANOTHER_VALID: 'also correct',
        INVALID_OBJECT: '',
        INVALID_ARRAY: ''
      })

      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "INVALID_OBJECT" in input "env" is not string compatible.'
      )
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "INVALID_ARRAY" in input "env" is not string compatible.'
      )
    })
  })

  describe('parseDictionaryInput with string pairs fallback', () => {
    it('falls back to parseDictList when JSON parsing fails', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'NODE_ENV=production\nAPI_URL=https://api.example.com\nDEBUG=false'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com',
        DEBUG: 'false'
      })
    })

    it('parses single key-value pair correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers: 'Content-Type=application/json'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({
        'Content-Type': 'application/json'
      })
    })

    it('handles multiple key-value pairs separated by newlines', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'DATABASE_HOST=localhost\nDATABASE_PORT=5432\nDATABASE_NAME=myapp'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'myapp'
      })
    })

    it('handles key-value pairs with spaces around equals sign', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers: 'Cache-Control = no-cache\nX-Frame-Options = DENY'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({
        'Cache-Control': 'no-cache',
        'X-Frame-Options': 'DENY'
      })
    })

    it('handles empty lines in string pairs input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'NODE_ENV=production\n\nAPI_URL=https://api.example.com\n\nDEBUG=false'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com',
        DEBUG: 'false'
      })
    })

    it('handles malformed key-value pairs gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'VALID_KEY=valid_value\nINVALID_NO_EQUALS\nANOTHER_VALID=another_value'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        VALID_KEY: 'valid_value',
        ANOTHER_VALID: 'another_value'
      })
    })

    it('handles values with equals signs in them', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'DATABASE_URL=postgresql://user:pass=word@host:5432/db\nEQUATION=x=y+z'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        DATABASE_URL: 'postgresql://user:pass=word@host:5432/db',
        EQUATION: 'x=y+z'
      })
    })

    it('handles mixed whitespace and trims keys and values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers:
            '  Content-Type  =  application/json  \n  Cache-Control  =  max-age=3600  '
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=3600'
      })
    })

    it('handles empty string pairs input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: ''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
    })

    it('handles only newlines in string pairs input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '\n\n\n'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
    })

    it('preserves JSON parsing when valid JSON is provided', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '{"NODE_ENV": "production", "API_URL": "https://api.example.com"}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com'
      })
    })

    it('falls back to string pairs when JSON is malformed but looks like key-value pairs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'NODE_ENV=production\nAPI_URL=https://api.example.com\n{invalid json'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com'
      })
    })

    it('handles complex values in string pairs format', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers:
            "Access-Control-Allow-Origin=*\nContent-Security-Policy=default-src 'self'; script-src 'self' 'unsafe-inline'"
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline'"
      })
    })

    it('handles special characters in keys and values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'SPECIAL_KEY-1=value with spaces\nKEY_WITH_UNDERSCORE=value-with-dashes\nNUMERIC_123=numeric_value_456'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        'SPECIAL_KEY-1': 'value with spaces',
        KEY_WITH_UNDERSCORE: 'value-with-dashes',
        NUMERIC_123: 'numeric_value_456'
      })
    })

    it('handles Windows-style line endings (CRLF)', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'KEY1=value1\r\nKEY2=value2\r\nKEY3=value3'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3'
      })
    })

    it('handles URL values with query parameters', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'API_ENDPOINT=https://api.example.com/v1?key=value&param=test\nWEBHOOK_URL=https://webhook.site/unique-id'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        API_ENDPOINT: 'https://api.example.com/v1?key=value&param=test',
        WEBHOOK_URL: 'https://webhook.site/unique-id'
      })
    })

    it('handles duplicate keys by using the last occurrence', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'DUPLICATE_KEY=first_value\nUNIQUE_KEY=unique_value\nDUPLICATE_KEY=second_value'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        DUPLICATE_KEY: 'second_value', // Last value wins
        UNIQUE_KEY: 'unique_value'
      })
    })

    it('verifies string pairs parsing is used when JSON parsing throws', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'NODE_ENV=development\nINVALID_JSON={broken'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        NODE_ENV: 'development',
        INVALID_JSON: '{broken'
      })
    })
  })

  describe('parseDictList quote handling', () => {
    it('handles double-quoted keys and values from YAML format', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"hello"="world"\n"test"="another"\n"NODE_ENV"="production"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        hello: 'world',
        test: 'another',
        NODE_ENV: 'production'
      })
    })

    it('handles single-quoted keys and values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: "'API_KEY'='secret-value'\n'DATABASE_URL'='postgresql://localhost:5432/db'"
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        API_KEY: 'secret-value',
        DATABASE_URL: 'postgresql://localhost:5432/db'
      })
    })

    it('handles mixed quoted and unquoted keys and values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"quoted_key"="quoted_value"\nunquoted_key=unquoted_value\n\'single_quoted\'=\'single_value\''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        quoted_key: 'quoted_value',
        unquoted_key: 'unquoted_value',
        single_quoted: 'single_value'
      })
    })

    it('handles values with quotes inside that should be preserved', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"JSON_CONFIG"=\'{"key": "value"}\'\n"SQL_QUERY"=\'SELECT * FROM "users"\''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        JSON_CONFIG: '{"key": "value"}',
        SQL_QUERY: 'SELECT * FROM "users"'
      })
    })

    it('handles partial quotes (only key quoted or only value quoted)', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"quoted_key"=unquoted_value\nunquoted_key="quoted_value"\n\'partial_single\'=mixed_value'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        quoted_key: 'unquoted_value',
        unquoted_key: 'quoted_value',
        partial_single: 'mixed_value'
      })
    })

    it('handles empty quoted strings correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"empty_value"=""\n"another_key"=\'value\'\nvalid_key="actual_value"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        another_key: 'value',
        valid_key: 'actual_value'
        // empty_value should be skipped due to empty value after quote removal
      })
    })

    it('handles mismatched quotes gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"mismatched_start=value\nkey=mismatched_end"\n"proper_key"="proper_value"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        '"mismatched_start': 'value',
        key: 'mismatched_end"',
        proper_key: 'proper_value'
      })
    })

    it('handles quotes with spaces and special characters', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"key with spaces"="value with spaces"\n"SPECIAL_CHARS"="!@#$%^&*()"\n"URL"="https://example.com?param=value"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        'key with spaces': 'value with spaces',
        SPECIAL_CHARS: '!@#$%^&*()',
        URL: 'https://example.com?param=value'
      })
    })

    it('handles values with equals signs and quotes', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"DATABASE_URL"="postgresql://user:pass=word@host:5432/db"\n"EQUATION"="x=y+z"\n"COMPLEX"="key=value&another=test"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        DATABASE_URL: 'postgresql://user:pass=word@host:5432/db',
        EQUATION: 'x=y+z',
        COMPLEX: 'key=value&another=test'
      })
    })

    it('handles YAML multiline format with proper indentation', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '  "API_ENDPOINT"="https://api.example.com"\n  "DEBUG_MODE"="true"\n  "LOG_LEVEL"="info"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        API_ENDPOINT: 'https://api.example.com',
        DEBUG_MODE: 'true',
        LOG_LEVEL: 'info'
      })
    })

    it('handles quotes in rsp_headers input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers:
            '"Content-Type"="application/json"\n"Cache-Control"="no-cache"\n"X-Custom-Header"="custom-value"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Custom-Header': 'custom-value'
      })
    })

    it('handles quotes in secrets input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets:
            '"database_password"="123"\n"api_key"="456"\n"encryption_key"="789"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        database_password: { id: 123 },
        api_key: { id: 456 },
        encryption_key: { id: 789 }
      })
    })

    it('skips entries where key becomes empty after quote removal', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '""="empty_key_value"\n"valid_key"="valid_value"\n\'\'=\'another_empty\''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        valid_key: 'valid_value'
        // Entries with empty keys after quote removal should be skipped
      })
    })

    it('skips entries where value becomes empty after quote removal', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"empty_value_key"=""\n"valid_key"="valid_value"\n\'another_empty\'=\'\''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        valid_key: 'valid_value'
        // Entries with empty values after quote removal should be skipped
      })
    })
  })

  describe('parseSecretsInput', () => {
    it('parses valid secrets input correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            database_password: '123',
            api_key: '456',
            encryption_key: '789'
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        database_password: { id: 123 },
        api_key: { id: 456 },
        encryption_key: { id: 789 }
      })
    })

    it('parses secrets from string pairs format', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'database_password=123\napi_key=456\nencryption_key=789'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        database_password: { id: 123 },
        api_key: { id: 456 },
        encryption_key: { id: 789 }
      })
    })

    it('handles numeric values in JSON format', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            database_password: 123,
            api_key: 456
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        database_password: { id: 123 },
        api_key: { id: 456 }
      })
    })

    it('handles zero and negative values correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'zero_secret=0\nnegative_secret=-1\npositive_secret=42'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        zero_secret: { id: 0 },
        negative_secret: { id: -1 },
        positive_secret: { id: 42 }
      })
    })

    it('handles non-numeric string values by removing them', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets:
            'valid_secret=123\ninvalid_secret=not-a-number\nanother_valid=456'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        valid_secret: { id: 123 },
        another_valid: { id: 456 }
      })
    })

    it('handles floating point numbers by parsing as integers', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'test_float_secret=123.456\ntest_another_float=789.012'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        test_float_secret: { id: 123 },
        test_another_float: { id: 789 }
      })
    })

    it('handles hexadecimal string values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'hex_secret=0x1A\nanother_hex=0xFF'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        hex_secret: { id: 0 }, // parseInt('0x1A', 10) returns 0
        another_hex: { id: 0 } // parseInt('0xFF', 10) returns 0
      })
    })

    it('handles octal and binary string values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'test_octal_secret=0755\ntest_binary_secret=0b1010'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        test_octal_secret: { id: 755 }, // parseInt('0755', 10) returns 755
        test_binary_secret: { id: 0 } // parseInt('0b1010', 10) returns 0
      })
    })

    it('handles empty string values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets:
            'test_valid_secret=123\ntest_empty_secret=\ntest_another_valid=456'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        test_valid_secret: { id: 123 },
        test_another_valid: { id: 456 }
      })
    })

    it('handles whitespace in values correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'secret1=  123  \nsecret2=456\t\nsecret3=  789'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        secret1: { id: 123 }, // Whitespace is trimmed before parseInt
        secret2: { id: 456 },
        secret3: { id: 789 }
      })
    })

    it('handles invalid JSON by falling back to string pairs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'database_password=123\n{invalid json\napi_key=456'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        database_password: { id: 123 },
        api_key: { id: 456 }
      })
    })

    it('handles mixed valid JSON format correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            string_id: '123',
            number_id: 456,
            boolean_value: true, // Will be converted to string "true"
            zero_value: 0
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        string_id: { id: 123 },
        number_id: { id: 456 },
        zero_value: { id: 0 }
      })
    })

    it('handles non-object JSON input gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: '"not an object"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "secrets" is not a valid JSON dictionary object.'
      )
    })

    it('handles array JSON input gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify([123, 456, 789])
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "secrets" is not a valid JSON dictionary object.'
      )
    })

    it('handles null JSON input gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'null'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "secrets" is not a valid JSON dictionary object.'
      )
    })

    it('handles empty input gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: ''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
    })

    it('handles object values in JSON by converting to empty string then NaN', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            valid_secret: '123',
            object_value: { nested: 'object' },
            array_value: [1, 2, 3]
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        valid_secret: { id: 123 }
      })

      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "object_value" in input "secrets" is not string compatible.'
      )
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "array_value" in input "secrets" is not string compatible.'
      )
    })

    it('returns empty object when parseDictionaryInput throws an error', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: '{completely broken json'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
    })

    it('handles large integer values correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'large_int=999999999\nmax_safe_int=9007199254740991'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        large_int: { id: 999999999 },
        max_safe_int: { id: 9007199254740991 }
      })
    })

    it('handles string with leading numbers correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'mixed_value=123abc\nnumber_only=456'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        mixed_value: { id: 123 }, // parseInt stops at first non-digit
        number_only: { id: 456 }
      })
    })

    it('catches errors from parseDictionaryInput and returns empty object', () => {
      // Mock parseDictionaryInput to throw an error by making getInput throw
      const originalGetInput = mockGetInput
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'secrets') {
          throw new Error('Simulated parsing error')
        }
        return ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse input as JSON: secrets. Using empty object instead.'
      )

      // Restore original mock
      mockGetInput.mockImplementation(originalGetInput)
    })
  })
})
