import * as core from '@actions/core'

import { FastEdgeClient } from '../api-utils/index.js'
import {
  createSecretResourceFromInputs,
  filterSecretSlots,
  isUpdateNeeded
} from './utils.js'

import { GetSecretResponse } from '../api-utils/types.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api_key')
    const apiUrl: string = core.getInput('api_url')
    const secretName: string = core.getInput('secret_name')

    if (!apiKey || !apiUrl || !secretName) {
      core.setFailed(
        'Mandatory inputs are missing: api_key, api_url, secret_name'
      )
      return
    }

    const secretId: string = core.getInput('secret_id')

    // Create a FastEdge API client instance
    const fastEdgeClient = new FastEdgeClient(apiKey, apiUrl)

    const secretResource = createSecretResourceFromInputs()

    if (secretResource.secret_slots.length === 0) {
      core.setFailed(
        'You must provide a "secret" value or a "secret_slots" string with at least one slot.'
      )
      return
    }

    let secret: GetSecretResponse | undefined
    if (secretId && secretId !== '0') {
      secret = await fastEdgeClient.secrets.get(secretId)
    } else if (secretName) {
      try {
        secret = await fastEdgeClient.secrets.getByName(secretName)
      } catch {
        core.debug(`Secret with name "${secretName}" not found.`)
      }
    }
    if (!secret) {
      // Create a new secret
      core.info(`Creating new secret with name: ${secretName}`)
      const createdSecret = await fastEdgeClient.secrets.create(secretResource)
      core.notice(`Secret created with ID: ${createdSecret.id}`)
      core.setOutput('secret_id', createdSecret.id)
      return
    }

    const secretUpdate = filterSecretSlots(secretResource, secret)

    if (isUpdateNeeded(secretUpdate, secret)) {
      const updatedSecret = await fastEdgeClient.secrets.update({
        ...secretUpdate,
        id: secret.id
      })
      core.notice(`Secret updated with ID: ${updatedSecret.id}`)
      core.setOutput('secret_id', updatedSecret.id)
    } else {
      core.info('No updates needed for the secret.')
      core.setOutput('secret_id', secret.id)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
