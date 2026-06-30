import type {
  GetTemplateResponse,
  UpdateTemplateResource
} from '../api-utils/types.js'

function isUpdateNeeded(
  desired: UpdateTemplateResource,
  existing: GetTemplateResponse
): boolean {
  if (
    desired.binary_id !== existing.binary_id ||
    desired.name !== existing.name ||
    (desired.short_descr ?? '') !== (existing.short_descr ?? '') ||
    (desired.long_descr ?? '') !== (existing.long_descr ?? '')
  ) {
    return true
  }
  // params compared by serialisation — action is source of truth so order is stable
  if (JSON.stringify(desired.params) !== JSON.stringify(existing.params)) {
    return true
  }
  return false
}

export { isUpdateNeeded }
