import { describe, it, expect, jest, beforeEach } from '@jest/globals'

import {
  createMockGetAppResponseWithBinary,
  createMockUpdateAppResource
} from '../../__fixtures__/mockResponse.js'

import { GetBinaryResponse } from '../../src/api-utils/types.js'

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

const { isUpdateNeeded } = await import('../../src/deploy-app/changes.js')

const mockIncludedBinary = {
  id: 101,
  api_type: 'wasi-http',
  checksum: 'checksum123',
  status: 1,
  source: 1
} as GetBinaryResponse

describe('isUpdateNeeded', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })
  it('returns true when app name has changed', () => {
    const updateResource = createMockUpdateAppResource({
      name: 'new-app-name'
    })

    const existingApp = createMockGetAppResponseWithBinary({
      name: 'old-app-name'
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when binary has changed', () => {
    const updateResource = createMockUpdateAppResource({
      binary: 102
    })

    const existingApp = createMockGetAppResponseWithBinary({
      binary: mockIncludedBinary
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when app comment has changed', () => {
    const updateResource = createMockUpdateAppResource({
      name: 'same-app-name',
      comment: 'Updated comment'
    })

    const existingApp = createMockGetAppResponseWithBinary({
      name: 'same-app-name',
      comment: 'Original comment'
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when environment variables have changed', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'same-app-name',
      comment: 'same comment',
      env: {
        NODE_ENV: 'production',
        API_URL: 'https://new-api.example.com'
      },
      rsp_headers: {},
      secrets: {}
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'same-app-name',
      comment: 'same comment',
      status: 1,
      env: {
        NODE_ENV: 'development',
        API_URL: 'https://old-api.example.com'
      },
      rsp_headers: {},
      secrets: {}
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when new environment variables are added', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'same-app-name',
      comment: 'same comment',
      env: {
        NODE_ENV: 'production',
        NEW_VAR: 'new-value'
      },
      rsp_headers: {},
      secrets: {}
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'same-app-name',
      comment: 'same comment',
      status: 1,
      env: {
        NODE_ENV: 'production'
      },
      rsp_headers: {},
      secrets: {}
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when environment variables are removed', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'same-app-name',
      comment: 'same comment',
      env: {
        NODE_ENV: 'production'
      },
      rsp_headers: {},
      secrets: {}
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'same-app-name',
      comment: 'same comment',
      status: 1,
      env: {
        NODE_ENV: 'production',
        OLD_VAR: 'old-value'
      },
      rsp_headers: {},
      secrets: {}
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when response headers have changed', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'same-app-name',
      comment: 'same comment',
      env: {},
      rsp_headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=3600'
      },
      secrets: {}
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'same-app-name',
      comment: 'same comment',
      status: 1,
      env: {},
      rsp_headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      },
      secrets: {}
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when secrets have changed', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'same-app-name',
      comment: 'same comment',
      env: {},
      rsp_headers: {},
      secrets: {
        database_password: { id: 456 },
        api_key: { id: 789 }
      }
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'same-app-name',
      comment: 'same comment',
      status: 1,
      env: {},
      rsp_headers: {},
      secrets: {
        database_password: { id: 123 },
        api_key: { id: 789 }
      }
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when new secrets are added', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'same-app-name',
      comment: 'same comment',
      env: {},
      rsp_headers: {},
      secrets: {
        database_password: { id: 123 },
        new_secret: { id: 456 }
      }
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'same-app-name',
      comment: 'same comment',
      status: 1,
      env: {},
      rsp_headers: {},
      secrets: {
        database_password: { id: 123 }
      }
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns true when secrets are removed', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'same-app-name',
      comment: 'same comment',
      env: {},
      rsp_headers: {},
      secrets: {
        database_password: { id: 123 }
      }
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'same-app-name',
      comment: 'same comment',
      status: 1,
      env: {},
      rsp_headers: {},
      secrets: {
        database_password: { id: 123 },
        old_secret: { id: 456 }
      }
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns false when nothing has changed', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'unchanged-app-name',
      comment: 'unchanged comment',
      env: {
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com'
      },
      rsp_headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      secrets: {
        database_password: { id: 123 },
        api_key: { id: 456 }
      }
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'unchanged-app-name',
      comment: 'unchanged comment',
      status: 1,
      env: {
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com'
      },
      rsp_headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      secrets: {
        database_password: { id: 123 },
        api_key: { id: 456 }
      }
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(false)
  })

  it('returns false when all fields are empty and unchanged', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'minimal-app',
      comment: '',
      env: {},
      rsp_headers: {},
      secrets: {}
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'minimal-app',
      comment: '',
      status: 1,
      env: {},
      rsp_headers: {},
      secrets: {}
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(false)
  })

  it('returns true when multiple fields have changed', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'new-app-name',
      comment: 'new comment',
      env: {
        NODE_ENV: 'staging'
      },
      rsp_headers: {
        'Content-Type': 'text/plain'
      },
      secrets: {
        new_secret: { id: 999 }
      }
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'old-app-name',
      comment: 'old comment',
      status: 1,
      env: {
        NODE_ENV: 'production'
      },
      rsp_headers: {
        'Content-Type': 'application/json'
      },
      secrets: {
        old_secret: { id: 123 }
      }
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('handles empty comment correctly when comparing', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'test-app',
      comment: '',
      env: {},
      rsp_headers: {},
      secrets: {}
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'test-app',
      comment: 'some comment',
      status: 1,
      env: {},
      rsp_headers: {},
      secrets: {}
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('handles complex dictionary value changes correctly', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'complex-app',
      comment: 'complex test',
      env: {
        DATABASE_URL: 'postgresql://new-host:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        LOG_LEVEL: 'debug'
      },
      rsp_headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Custom-Header': 'updated-value'
      },
      secrets: {
        db_secret: { id: 100 },
        cache_secret: { id: 200 }
      }
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'complex-app',
      comment: 'complex test',
      status: 1,
      env: {
        DATABASE_URL: 'postgresql://old-host:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        LOG_LEVEL: 'info'
      },
      rsp_headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Custom-Header': 'old-value'
      },
      secrets: {
        db_secret: { id: 100 },
        cache_secret: { id: 300 }
      }
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(true)
  })

  it('returns false when dictionary order differs but content is identical', () => {
    const updateResource = createMockUpdateAppResource({
      id: 123,
      binary: 101,
      name: 'order-test-app',
      comment: 'order test',
      env: {
        VAR_A: 'value-a',
        VAR_B: 'value-b'
      },
      rsp_headers: {
        'Header-X': 'x-value',
        'Header-Y': 'y-value'
      },
      secrets: {
        secret1: { id: 1 },
        secret2: { id: 2 }
      }
    })

    const existingApp = createMockGetAppResponseWithBinary({
      id: 123,
      binary: mockIncludedBinary,
      name: 'order-test-app',
      comment: 'order test',
      status: 1,
      env: {
        VAR_B: 'value-b',
        VAR_A: 'value-a'
      },
      rsp_headers: {
        'Header-Y': 'y-value',
        'Header-X': 'x-value'
      },
      secrets: {
        secret2: { id: 2 },
        secret1: { id: 1 }
      }
    })

    const result = isUpdateNeeded(updateResource, existingApp)
    expect(result).toBe(false)
  })
})
