import pkg from '../../package.json' with { type: 'json' }
import { apiHeaders, buildUserAgent } from '../../src/api-utils/headers.js'

const base = `fastedge-github-action/${pkg.version}`

describe('headers', () => {
  const originalEnv = { ...process.env }
  beforeEach(() => {
    delete process.env.FASTEDGE_ACTION_CLIENT
  })
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('replaces non-ASCII and control characters so fetch accepts the header', () => {
    process.env.GITHUB_ACTION_REF = 'feature/日本'
    process.env.FASTEDGE_ACTION_CLIENT = 'x\ny'
    const ua = buildUserAgent('deploy-app')
    expect(ua).toBe(`${base} (deploy-app; ref=feature/??) x?y`)
    expect(() => new Headers({ 'User-Agent': ua })).not.toThrow()
  })

  it('appends the wrapper client token when FASTEDGE_ACTION_CLIENT is set', () => {
    process.env.GITHUB_ACTION_REF = 'v1'
    process.env.FASTEDGE_ACTION_CLIENT = ' gcore-org-workflow/1.0 '
    expect(buildUserAgent('deploy-app')).toBe(
      `${base} (deploy-app; ref=v1) gcore-org-workflow/1.0`
    )
  })

  it('sends the bundled version plus the pinned ref', () => {
    process.env.GITHUB_ACTION_REF = 'v1'
    expect(buildUserAgent('deploy-app')).toBe(`${base} (deploy-app; ref=v1)`)
  })

  it('falls back to ref=unknown when GITHUB_ACTION_REF is not set', () => {
    delete process.env.GITHUB_ACTION_REF
    expect(buildUserAgent('secrets')).toBe(`${base} (secrets; ref=unknown)`)
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
