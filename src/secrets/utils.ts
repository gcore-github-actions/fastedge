import * as core from '@actions/core'
import crypto from 'node:crypto'

import type {
  GetSecretResponse,
  SecretResource,
  SecretSlots
} from '../api-utils/types.js'

/**
 * Type guard to validate if an object is a valid SecretSlots
 */
function isValidSecretSlot(slot: SecretSlots): slot is SecretSlots {
  return (
    typeof slot === 'object' &&
    slot !== null &&
    typeof slot.slot === 'number' &&
    typeof slot.value === 'string' &&
    slot.value.trim() !== ''
  )
}

function parseSecretSlots(secretSlotsInput = '[]'): Array<SecretSlots> {
  try {
    const secretSlots = JSON.parse(secretSlotsInput.trim())
    if (!Array.isArray(secretSlots)) {
      core.warning(`Failed to parse secret_slots as valid JSON array.`)
      return []
    }
    const isValid = secretSlots.every(isValidSecretSlot)
    if (!isValid) {
      core.warning(
        `Failed to validate secret_slots. Each slot must be an object with 'slot' and 'value' properties.`
      )
      return []
    }
    return secretSlots
  } catch {
    core.warning(`Failed to parse secret_slots as JSON`)
    return []
  }
}

function createSecretSlots(): Array<SecretSlots> {
  let secretSlots = parseSecretSlots(core.getInput('secret_slots'))
  if (secretSlots.length === 0) {
    const secretValue = core.getInput('secret_value') || ''
    if (secretValue.trim() !== '') {
      secretSlots = [
        {
          slot: 0,
          value: secretValue
        }
      ]
    }
  }
  if (secretSlots.length === 0) {
    core.warning('No secret_slots provided.')
  }
  return secretSlots
}

/**
 * Creates a secret resource from the action inputs.
 */

function createSecretResourceFromInputs(): SecretResource {
  const secretSlots = createSecretSlots()
  return {
    name: core.getInput('secret_name'),
    comment: core.getInput('comment') || '',
    secret_slots: secretSlots
  }
}

/**
 * Verifies that the existing secret slots match the provided ones.
 * If a slot is not provided, it will be marked for deletion.
 * If the checksums match, it will not update the secret.
 */

function filterSecretSlots(
  secretResource: SecretResource,
  existingSecret: GetSecretResponse
): SecretResource {
  const secretSlotsToRemove = existingSecret.secret_slots
    .filter(
      (slot) => !secretResource.secret_slots.some((s) => s.slot === slot.slot)
    )
    .map((slot) => ({
      slot: slot.slot
    }))

  const secretsToUpdate = secretResource.secret_slots.filter((slot) => {
    const existingSlot = existingSecret.secret_slots.find(
      (s) => s.slot === slot.slot
    )
    if (!existingSlot) return true // New slot to be added
    if (!slot.value) {
      core.warning(
        `Secret "${secretResource.name}" slot: ${slot.slot} has no value, skipping!`
      )
      return false
    }
    const slotValueChecksum = crypto
      .createHash('sha256')
      .update(slot.value)
      .digest('hex')

    return existingSlot.checksum !== slotValueChecksum
  })

  return {
    ...secretResource,
    secret_slots: [
      ...secretsToUpdate,
      ...secretSlotsToRemove
    ] as unknown as Array<SecretSlots>
  }
}

/**
 * Checks to see if there are any updates needed for the secret.
 * It compares the provided secret resource with the existing secret.
 */

function isUpdateNeeded(
  secretResource: SecretResource,
  existingSecret: GetSecretResponse
): boolean {
  if (secretResource.secret_slots.length > 0) {
    // filterSecretsSlots will return an empty array if no updates are needed
    return true
  }
  if (
    secretResource.name !== existingSecret.name ||
    secretResource.comment !== existingSecret.comment
  ) {
    // If the name or comment has changed, we need to update
    return true
  }
  return false
}

export { createSecretResourceFromInputs, filterSecretSlots, isUpdateNeeded }
