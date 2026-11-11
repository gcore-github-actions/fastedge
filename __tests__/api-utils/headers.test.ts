import { apiHeaders, buildUserAgent } from '../../src/api-utils/headers.js'

describe('headers', () => {
  const originalEnv = { ...process.env }
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('appends the wrapper client token when FASTEDGE_ACTION_CLIENT is set', () => {
    process.env.GITHUB_ACTION_REF = 'v1'
    process.env.FASTEDGE_ACTION_CLIENT = ' gcore-org-workflow/1.0 '
    expect(buildUserAgent('deploy-app')).toBe(
      'fastedge-github-action/v1 (deploy-app) gcore-org-workflow/1.0'
    )
  })

  it('builds user agent from the pinned action ref', () => {
    process.env.GITHUB_ACTION_REF = 'v1'
    expect(buildUserAgent('deploy-app')).toBe(
      'fastedge-github-action/v1 (deploy-app)'
    )
  })

  it('falls back to "local" when not run as a published action', () => {
    delete process.env.GITHUB_ACTION_REF
    expect(buildUserAgent('secrets')).toBe(
      'fastedge-github-action/local (secrets)'
    )
  })

  it('adds User-Agent only when configured', () => {
    expect(apiHeaders({ apiKey: 'k', apiUrl: 'u' })).toEqual({
      Authorization: 'APIKey k'
    })
    expect(apiHeaders({ apiKey: 'k', apiUrl: 'u', userAgent: 'ua' })).toEqual({
      Authorization: 'APIKey k',
      'User-Agent': 'ua'
    })
  })
})
