import type {
  GetAppResponseWithBinary,
  UpdateAppResource
} from '../api-utils/types.js'

type SecretEntry = {
  id: number
}

function hasDictionaryChanged(
  dict1: Record<string, string>,
  dict2: Record<string, string>
): boolean {
  const keys1 = Object.keys(dict1)
  const keys2 = Object.keys(dict2)
  if (keys1.length !== keys2.length) return true
  for (const key of keys1) {
    if (!dict2[key] || dict1[key] !== dict2[key]) {
      return true
    }
  }
  return false
}

function hasSecretsChanged(
  dict1: Record<string, SecretEntry>,
  dict2: Record<string, SecretEntry>
): boolean {
  const keys1 = Object.keys(dict1)
  const keys2 = Object.keys(dict2)
  if (keys1.length !== keys2.length) {
    return true
  }
  for (const key of keys1) {
    if (!dict2[key] || dict1[key].id !== dict2[key].id) {
      return true
    }
  }
  return false
}

/**
 * Checks to see if there are any updates needed for the application.
 * It compares the provided application resource with the existing application.
 */
function isUpdateNeeded(
  updateResource: UpdateAppResource,
  existingApp: GetAppResponseWithBinary
): boolean {
  if (
    updateResource.name !== existingApp.name ||
    updateResource.comment !== existingApp.comment ||
    updateResource.binary !== existingApp.binary.id
  ) {
    return true
  }
  if (hasDictionaryChanged(updateResource.env, existingApp.env)) {
    return true
  }
  if (
    hasDictionaryChanged(updateResource.rsp_headers, existingApp.rsp_headers)
  ) {
    return true
  }
  if (hasSecretsChanged(updateResource.secrets, existingApp.secrets)) {
    return true
  }
  return false
}

export { isUpdateNeeded }
