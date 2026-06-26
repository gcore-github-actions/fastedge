import * as core from '@actions/core'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type {
  CreateTemplateResource,
  TemplateParam
} from '../api-utils/types.js'

function parseParamsInput(): TemplateParam[] {
  const input = core.getInput('params') || '[]'
  try {
    const parsed = JSON.parse(input.trim())
    if (!Array.isArray(parsed)) {
      core.warning(
        'Input "params" is not a valid JSON array. Using empty array.'
      )
      return []
    }
    return parsed as TemplateParam[]
  } catch {
    core.warning('Failed to parse "params" as JSON. Using empty array.')
    return []
  }
}

function createTemplateResourceFromInputs(): Omit<
  CreateTemplateResource,
  'binary_id'
> {
  return {
    name: core.getInput('template_name'),
    short_descr: core.getInput('short_descr') || '',
    long_descr: core.getInput('long_descr') || '',
    owned: true,
    params: parseParamsInput()
  }
}

function hasWasmBinaryChanged(knownHash: string): boolean {
  const normalizedPath = path.normalize(core.getInput('wasm_file'))
  const wasmBuffer = fs.readFileSync(normalizedPath)
  const checksum = crypto.createHash('md5').update(wasmBuffer).digest('hex')
  return checksum !== knownHash
}

export {
  createTemplateResourceFromInputs,
  hasWasmBinaryChanged,
  parseParamsInput
}
