import * as core from '@actions/core'

import type {
  CreateTemplateResource,
  GetTemplateResponse,
  UpdateTemplateResource
} from '../api-utils/types.js'
import { FastEdgeClient } from '../api-utils/index.js'
import { isUpdateNeeded } from './changes.js'
import {
  createTemplateResourceFromInputs,
  hasWasmBinaryChanged
} from './utils.js'

export async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api_key')
    const apiUrl: string = core.getInput('api_url')
    const wasmFile: string = core.getInput('wasm_file')
    const templateName: string = core.getInput('template_name')

    if (!apiKey || !apiUrl || !wasmFile || !templateName) {
      core.setFailed(
        'Mandatory inputs are missing: api_key, api_url, wasm_file, template_name'
      )
      return
    }

    const templateId: string = core.getInput('template_id')
    const client = new FastEdgeClient(apiKey, apiUrl)

    let template: GetTemplateResponse | undefined
    if (templateId && templateId !== '0') {
      template = await client.templates.get(templateId)
      core.info(`Found template with ID: ${templateId}`)
    } else {
      try {
        template = await client.templates.getByName(templateName)
        core.info(`Found template with name: ${templateName}`)
      } catch {
        core.info(`Template with name "${templateName}" not found`)
      }
    }

    if (!template) {
      core.info(`Creating new template: ${templateName}`)
      const binary = await client.binaries.upload(wasmFile)
      const resource: CreateTemplateResource = {
        ...createTemplateResourceFromInputs(),
        binary_id: binary.id
      }
      const created = await client.templates.create(resource)
      core.notice(`Template created with ID: ${created.id}`)
      core.setOutput('template_id', created.id)
      core.setOutput('binary_id', binary.id)
      return
    }

    core.info(`Updating template: ${templateName}`)
    const existingBinary = await client.binaries.get(template.binary_id)
    let binaryId: number
    if (
      !existingBinary.checksum ||
      hasWasmBinaryChanged(existingBinary.checksum)
    ) {
      core.debug('Binary has changed, uploading new binary...')
      const newBinary = await client.binaries.upload(wasmFile)
      binaryId = newBinary.id
    } else {
      binaryId = existingBinary.id
    }

    const resource: UpdateTemplateResource = {
      ...createTemplateResourceFromInputs(),
      binary_id: binaryId,
      id: template.id
    }

    if (isUpdateNeeded(resource, template)) {
      const updated = await client.templates.update(resource)
      core.notice(`Template updated with ID: ${updated.id}`)
      core.setOutput('template_id', updated.id)
    } else {
      core.info('No changes detected, skipping update.')
      core.setOutput('template_id', template.id)
    }
    core.setOutput('binary_id', binaryId)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
