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

const { isUpdateNeeded } = await import('../../src/deploy-template/changes.js')

const baseTemplate = {
  id: 100,
  binary_id: 500,
  name: 'my-template',
  short_descr: 'A description',
  long_descr: 'A long description',
  api_type: 'wasi-http' as const,
  owned: true,
  params: [
    {
      name: 'DEFAULT',
      data_type: 'string' as const,
      descr: 'Default URL',
      mandatory: true,
      metadata: ''
    }
  ]
}

const baseResource = {
  id: 100,
  binary_id: 500,
  name: 'my-template',
  short_descr: 'A description',
  long_descr: 'A long description',
  owned: true,
  params: [
    {
      name: 'DEFAULT',
      data_type: 'string' as const,
      descr: 'Default URL',
      mandatory: true,
      metadata: ''
    }
  ]
}

describe('isUpdateNeeded', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns false when nothing has changed', () => {
    expect(isUpdateNeeded(baseResource, baseTemplate)).toBe(false)
  })

  it('returns true when binary_id has changed', () => {
    expect(
      isUpdateNeeded({ ...baseResource, binary_id: 999 }, baseTemplate)
    ).toBe(true)
  })

  it('returns true when name has changed', () => {
    expect(
      isUpdateNeeded({ ...baseResource, name: 'new-name' }, baseTemplate)
    ).toBe(true)
  })

  it('returns true when short_descr has changed', () => {
    expect(
      isUpdateNeeded({ ...baseResource, short_descr: 'Updated' }, baseTemplate)
    ).toBe(true)
  })

  it('returns true when long_descr has changed', () => {
    expect(
      isUpdateNeeded(
        { ...baseResource, long_descr: 'Updated long' },
        baseTemplate
      )
    ).toBe(true)
  })

  it('returns true when params array differs', () => {
    const updated = {
      ...baseResource,
      params: [
        {
          name: 'NEW_PARAM',
          data_type: 'string' as const,
          descr: 'New',
          mandatory: false,
          metadata: ''
        }
      ]
    }
    expect(isUpdateNeeded(updated, baseTemplate)).toBe(true)
  })

  it('returns true when a param is added', () => {
    const updated = {
      ...baseResource,
      params: [
        ...baseResource.params,
        {
          name: 'EXTRA',
          data_type: 'number' as const,
          descr: 'Extra',
          mandatory: false,
          metadata: ''
        }
      ]
    }
    expect(isUpdateNeeded(updated, baseTemplate)).toBe(true)
  })

  it('returns true when a param is removed', () => {
    const updated = { ...baseResource, params: [] }
    expect(isUpdateNeeded(updated, baseTemplate)).toBe(true)
  })

  it('returns true when param metadata changes', () => {
    const updated = {
      ...baseResource,
      params: [
        {
          name: 'DEFAULT',
          data_type: 'enum' as const,
          descr: 'Default URL',
          mandatory: true,
          metadata:
            '{"enum_values":[{"value":"a","label":"A"}],"default_value":"a"}'
        }
      ]
    }
    expect(isUpdateNeeded(updated, baseTemplate)).toBe(true)
  })

  it('handles undefined short_descr as empty string on both sides', () => {
    const existing = { ...baseTemplate, short_descr: undefined }
    const desired = { ...baseResource, short_descr: undefined }
    expect(isUpdateNeeded(desired, existing)).toBe(false)
  })

  it('returns true when desired short_descr is set and existing is undefined', () => {
    const existing = { ...baseTemplate, short_descr: undefined }
    expect(
      isUpdateNeeded({ ...baseResource, short_descr: 'New' }, existing)
    ).toBe(true)
  })

  it('returns false when params are empty on both sides', () => {
    const existing = { ...baseTemplate, params: [] }
    const desired = { ...baseResource, params: [] }
    expect(isUpdateNeeded(desired, existing)).toBe(false)
  })
})
