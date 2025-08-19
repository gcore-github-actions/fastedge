import * as core from '@actions/core'

import {
  CreateAppResource,
  FastEdgeClient,
  GetBinaryResponse,
  UpdateAppResource,
  UploadBinaryResponse
} from '../api-utils/index.js'

import { isUpdateNeeded } from './changes.js'
import { createAppResourceFromInputs, hasWasmBinaryChanged } from './utils.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api_key')
    const apiUrl: string = core.getInput('api_url')
    const wasmFile: string = core.getInput('wasm_file')
    const appName: string = core.getInput('app_name')

    if (!apiKey || !apiUrl || !wasmFile || !appName) {
      core.setFailed(
        'Mandatory inputs are missing: api_key, api_url, wasm_file, app_name'
      )
      return
    }

    const appId: string = core.getInput('app_id')

    // Create a FastEdge API client instance
    const fastEdgeClient = new FastEdgeClient(apiKey, apiUrl)

    // Check if the app exists
    let app
    if (appId && appId !== '0') {
      app = await fastEdgeClient.apps.get(appId).includeBinary()
      core.info(`Found application with ID: ${appId}`)
    } else if (appName) {
      try {
        app = await fastEdgeClient.apps.getByName(appName).includeBinary()
        core.info(`Found application with name: ${appName}`)
      } catch {
        core.info(`Application with name "${appName}" not found`)
      }
    }
    if (!app) {
      core.info(`Creating new application with name: ${appName}`)
      const binary = await fastEdgeClient.binaries.upload(wasmFile)

      const appResource = {
        ...createAppResourceFromInputs(),
        binary: binary.id
      } as CreateAppResource

      const createdApp = await fastEdgeClient.apps.create(appResource)
      core.notice(`Application created with ID: ${createdApp.id}`)
      core.setOutput('app_id', createdApp.id)
      core.setOutput('binary_id', createdApp.binary)
      return
    }

    core.info(`Updating application with name: ${appName}`)
    let binary: GetBinaryResponse | UploadBinaryResponse = app.binary
    if (!app.binary.checksum || hasWasmBinaryChanged(app.binary.checksum)) {
      core.debug('Binary has changed, uploading new binary...')
      binary = await fastEdgeClient.binaries.upload(core.getInput('wasm_file'))
    }
    const appResource = {
      ...createAppResourceFromInputs(),
      binary: binary.id,
      id: app.id
    } as UpdateAppResource

    if (isUpdateNeeded(appResource, app)) {
      const updatedApp = await fastEdgeClient.apps.update(appResource)
      core.notice(`Application updated with ID: ${updatedApp.id}`)
      core.setOutput('app_id', updatedApp.id)
      core.setOutput('binary_id', updatedApp.binary)
      return
    } else {
      core.info('No changes detected, skipping update.')
      core.setOutput('app_id', appResource.id)
      core.setOutput('binary_id', appResource.binary)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
