import process from 'node:process'

import pkg from '../../package.json' with { type: 'json' }

import { ApiConfig } from './types.js'

/**
 * e.g. `fastedge-github-action/1.1.0 (deploy-app; ref=v1) gcore-org-workflow/1.0`.
 * The version is bundled from package.json, so it survives SHA pinning.
 * GITHUB_ACTION_REF is the ref the workflow pinned in `uses:` (tag, branch or SHA);
 * GitHub does not guarantee it in every context, hence `unknown`.
 * FASTEDGE_ACTION_CLIENT is set by Gcore wrappers (e.g. org reusable workflows)
 * to tell their traffic apart from native use. Metrics only — anyone can set it.
 */
function buildUserAgent(action: string): string {
  const ref = process.env.GITHUB_ACTION_REF || 'unknown'
  const client = process.env.FASTEDGE_ACTION_CLIENT?.trim()
  const ua = `fastedge-github-action/${pkg.version} (${action}; ref=${ref})`
  // Keep to printable ASCII: fetch throws on chars > 0xFF and non-ASCII bytes
  // are obsolete in HTTP header values (RFC 9110), so proxies may mangle them.
  return (client ? `${ua} ${client}` : ua).replace(/[^\x20-\x7e]/g, '?')
}

function apiHeaders(apiConfig: ApiConfig): Record<string, string> {
  return {
    Authorization: `APIKey ${apiConfig.apiKey}`,
    ...(apiConfig.userAgent && { 'User-Agent': apiConfig.userAgent })
  }
}

export { apiHeaders, buildUserAgent }
