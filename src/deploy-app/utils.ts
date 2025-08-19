import * as core from '@actions/core'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { CreateAppResource } from '../api-utils/types.js'

type DictionaryInput = 'env' | 'rsp_headers' | 'secrets'

type SecretEntry = {
  id: number
}

function removeMatchingQuotes(str: string): string {
  if (str.length < 2) {
    return str
  }

  const first = str[0]
  const last = str[str.length - 1]

  // Only remove quotes if they match at both ends
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return str.slice(1, -1)
  }

  return str
}

function parseDictList(pairs: string): { [key: string]: string } {
  const result: { [key: string]: string } = {}
  for (const pair of pairs.split('\n')) {
    const [_key, ...vals] = pair.split('=')
    const key = _key.trim()
    const val = vals.join('=').trim()
    if (!key || !val) {
      continue
    }

    const cleanKey = removeMatchingQuotes(key)
    const cleanVal = removeMatchingQuotes(val)

    if (!cleanKey || !cleanVal) {
      continue
    }

    result[cleanKey] = cleanVal
  }
  return result
}

function parseDictionaryInput(input: DictionaryInput): Record<string, string> {
  const inputString = core.getInput(input) || '{}'
  let dict = {}
  try {
    dict = JSON.parse(inputString.trim())
  } catch {
    // If parsing fails, treat it as a string pairs
    dict = parseDictList(inputString.trim())
  }
  if (typeof dict !== 'object' || dict === null || Array.isArray(dict)) {
    core.warning(`Input "${input}" is not a valid JSON dictionary object.`)
    return {}
  }
  const parsedDict = Object.entries(dict).reduce(
    (acc, [key, value]) => {
      if (typeof value === 'object') {
        core.warning(
          `Value for key "${key}" in input "${input}" is not string compatible.`
        )
        acc[key] = ''
        return acc
      }
      acc[key] = value.toString().trim()
      return acc
    },
    {} as Record<string, string>
  )
  return parsedDict
}

function parseSecretsInput(): Record<string, SecretEntry> {
  try {
    const secretsDict = parseDictionaryInput('secrets')
    // Strip everything except the id from each secret entry
    return Object.entries(secretsDict).reduce(
      (acc, [key, value]) => {
        const id = Number.parseInt(value, 10)
        if (Number.isNaN(id)) {
          return acc
        }
        acc[key] = { id }
        return acc
      },
      {} as Record<string, SecretEntry>
    )
  } catch {
    core.warning(
      `Failed to parse input as JSON: secrets. Using empty object instead.`
    )
    return {}
  }
}

/**
 * Creates an application resource from the action inputs.
 */

function createAppResourceFromInputs(): Partial<CreateAppResource> {
  return {
    name: core.getInput('app_name'),
    status: 1,
    env: parseDictionaryInput('env'),
    rsp_headers: parseDictionaryInput('rsp_headers'),
    secrets: parseSecretsInput(),
    comment: core.getInput('comment') || ''
  }
}

/**
 * Checks if the current WASM binary has changed compared to a known hash on the api.
 * @param knownHash - The hash of the known binary. (Response from the API)
 * @return boolean - True if the binary has changed, false otherwise.
 */

function hasWasmBinaryChanged(knownHash: string): boolean {
  const normalizedPath = path.normalize(core.getInput('wasm_file'))
  const wasmBuffer = fs.readFileSync(normalizedPath)
  const checksum = crypto.createHash('md5').update(wasmBuffer).digest('hex')
  return checksum !== knownHash
}

export { createAppResourceFromInputs, hasWasmBinaryChanged }
