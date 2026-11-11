import process from 'node:process'

import { ApiConfig } from './types.js'

/**
 * e.g. `fastedge-github-action/v1 (deploy-app) gcore-org-workflow/1.0`.
 * GITHUB_ACTION_REF is the ref the workflow pinned in `uses:` (tag, branch or SHA).
 * FASTEDGE_ACTION_CLIENT is set by Gcore wrappers (e.g. org reusable workflows)
 * to tell their traffic apart from native use. Metrics only — anyone can set it.
 */
function buildUserAgent(action: string): string {
  const ref = process.env.GITHUB_ACTION_REF || 'local'
  const client = process.env.FASTEDGE_ACTION_CLIENT?.trim()
  const ua = `fastedge-github-action/${ref} (${action})`
  // Header values must be printable ASCII or fetch throws; refs/env can hold Unicode.
  return (client ? `${ua} ${client}` : ua).replace(/[^\x20-\x7e]/g, '?')
}

function apiHeaders(apiConfig: ApiConfig): Record<string, string> {
  return {
    Authorization: `APIKey ${apiConfig.apiKey}`,
    ...(apiConfig.userAgent && { 'User-Agent': apiConfig.userAgent })
  }
}

export { apiHeaders, buildUserAgent }
