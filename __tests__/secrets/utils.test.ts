import crypto from 'node:crypto'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { GetSecretResponse, SecretResource } from '../../src/api-utils/types.js'

const mockGetInput = jest.fn<(name: string) => string>()
const mockWarning = jest.fn()

jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  warning: mockWarning,
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn()
}))

await import('@actions/core')
const { createSecretResourceFromInputs, filterSecretSlots, isUpdateNeeded } =
  await import('../../src/secrets/utils.js')

describe('Secrets Utils functions', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('createSecretResourceFromInputs', () => {
    it('creates secret resource with valid secret_slots input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'database-config',
          comment: 'Production database configuration',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'primary-db-password' },
            { slot: 1, value: 'backup-db-password' }
          ]),
          secret_value: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'database-config',
        comment: 'Production database configuration',
        secret_slots: [
          { slot: 0, value: 'primary-db-password' },
          { slot: 1, value: 'backup-db-password' }
        ]
      })
    })

    it('creates secret resource with fallback to secret input when secret_slots is empty', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'api-key',
          comment: 'External API key',
          secret_slots: '[]',
          secret_value: 'fallback-secret-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'api-key',
        comment: 'External API key',
        secret_slots: [{ slot: 0, value: 'fallback-secret-value' }]
      })
    })

    it('creates secret resource with minimal inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'minimal-secret',
          comment: '',
          secret_slots: JSON.stringify([{ slot: 0, value: 'simple-value' }]),
          secret_value: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'minimal-secret',
        comment: '',
        secret_slots: [{ slot: 0, value: 'simple-value' }]
      })
    })

    it('handles invalid JSON in secret_slots with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'invalid-json-secret',
          comment: 'Test with invalid JSON',
          secret_slots: '{invalid json}',
          secret_value: 'fallback-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-json-secret',
        comment: 'Test with invalid JSON',
        secret_slots: [{ slot: 0, value: 'fallback-value' }]
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse secret_slots as JSON'
      )
    })

    it('handles non-array secret_slots input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'non-array-secret',
          comment: 'Test with non-array JSON',
          secret_slots: '{"not": "an array"}',
          secret_value: 'fallback-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'non-array-secret',
        comment: 'Test with non-array JSON',
        secret_slots: [{ slot: 0, value: 'fallback-value' }]
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse secret_slots as valid JSON array.'
      )
    })

    it('handles invalid secret slot objects with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'invalid-slots-secret',
          comment: 'Test with invalid slot objects',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'valid-slot' },
            { slot: 'invalid', value: 'invalid-slot' }, // slot should be number
            { slot: 1, value: '' } // empty value
          ]),
          secret_value: 'fallback-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-slots-secret',
        comment: 'Test with invalid slot objects',
        secret_slots: [{ slot: 0, value: 'fallback-value' }]
      })
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secret_slots. Each slot must be an object with 'slot' and 'value' properties."
      )
    })

    it('handles empty secret_slots and empty secret with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'empty-secret',
          comment: 'Test with no secrets',
          secret_slots: '[]',
          secret_value: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'empty-secret',
        comment: 'Test with no secrets',
        secret_slots: []
      })
      expect(mockWarning).toHaveBeenCalledWith('No secret_slots provided.')
    })

    it('handles whitespace-only secret input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'whitespace-secret',
          comment: 'Test with whitespace secret',
          secret_slots: '[]',
          secret_value: '   \t\n   '
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'whitespace-secret',
        comment: 'Test with whitespace secret',
        secret_slots: []
      })
      expect(mockWarning).toHaveBeenCalledWith('No secret_slots provided.')
    })

    it('handles multiple valid slots', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'multi-slot-secret',
          comment: 'Secret with multiple slots',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'primary-secret' },
            { slot: 1, value: 'secondary-secret' },
            { slot: 5, value: 'tertiary-secret' }
          ]),
          secret_value: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'multi-slot-secret',
        comment: 'Secret with multiple slots',
        secret_slots: [
          { slot: 0, value: 'primary-secret' },
          { slot: 1, value: 'secondary-secret' },
          { slot: 5, value: 'tertiary-secret' }
        ]
      })
    })

    it('handles empty comment input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'no-comment-secret',
          comment: '',
          secret_slots: JSON.stringify([{ slot: 0, value: 'secret-value' }]),
          secret_value: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'no-comment-secret',
        comment: '',
        secret_slots: [{ slot: 0, value: 'secret-value' }]
      })
    })

    it('prioritizes secret_slots over secret input when both are provided', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'priority-test-secret',
          comment: 'Testing priority',
          secret_slots: JSON.stringify([{ slot: 2, value: 'priority-secret' }]),
          secret_value: 'ignored-fallback-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'priority-test-secret',
        comment: 'Testing priority',
        secret_slots: [{ slot: 2, value: 'priority-secret' }]
      })
    })

    it('handles slots with special characters and unicode', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'unicode-secret',
          comment: 'Secret with special characters',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'password123!@#$%^&*()' },
            { slot: 1, value: 'üñîçødé-sécret' }
          ]),
          secret_value: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'unicode-secret',
        comment: 'Secret with special characters',
        secret_slots: [
          { slot: 0, value: 'password123!@#$%^&*()' },
          { slot: 1, value: 'üñîçødé-sécret' }
        ]
      })
    })

    it('handles mixed valid and invalid slots by falling back to secret input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'mixed-validity-secret',
          comment: 'Mixed valid and invalid slots',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'valid-slot' },
            { slot: null, value: 'invalid-slot' }, // null slot
            { slot: 2, value: 'another-valid-slot' }
          ]),
          secret_value: 'fallback-secret'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'mixed-validity-secret',
        comment: 'Mixed valid and invalid slots',
        secret_slots: [{ slot: 0, value: 'fallback-secret' }]
      })
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secret_slots. Each slot must be an object with 'slot' and 'value' properties."
      )
    })
  })

  describe('filterSecretSlots', () => {
    it('adds missing slots for deletion when new resource has fewer slots', () => {
      const secretResource: SecretResource = {
        name: 'test-secret',
        comment: 'Test secret',
        secret_slots: [
          { slot: 0, value: 'new-value-0' },
          { slot: 2, value: 'new-value-2' }
        ]
      }

      const existingSecret: GetSecretResponse = {
        id: 123,
        name: 'test-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'old-value-0', checksum: 'old-checksum-0' },
          { slot: 1, value: 'old-value-1', checksum: 'old-checksum-1' },
          { slot: 2, value: 'old-value-2', checksum: 'old-checksum-2' },
          { slot: 3, value: 'old-value-3', checksum: 'old-checksum-3' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'test-secret',
        comment: 'Test secret',
        secret_slots: [
          { slot: 0, value: 'new-value-0' }, // Different checksum, included
          { slot: 2, value: 'new-value-2' }, // Different checksum, included
          { slot: 1 }, // Marked for deletion
          { slot: 3 } // Marked for deletion
        ]
      })
    })

    it('excludes slots with matching checksums from update', () => {
      const secretResource: SecretResource = {
        name: 'checksum-test-secret',
        comment: 'Testing checksum comparison',
        secret_slots: [
          { slot: 0, value: 'unchanged-value' },
          { slot: 1, value: 'changed-value' },
          { slot: 2, value: 'another-unchanged-value' }
        ]
      }

      // Generate actual checksums for the test values
      const unchangedValueChecksum = crypto
        .createHash('sha256')
        .update('unchanged-value')
        .digest('hex')
      const anotherUnchangedValueChecksum = crypto
        .createHash('sha256')
        .update('another-unchanged-value')
        .digest('hex')

      const existingSecret: GetSecretResponse = {
        id: 456,
        name: 'checksum-test-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          {
            slot: 0,
            value: 'encrypted-value-0',
            checksum: unchangedValueChecksum
          }, // Same checksum
          {
            slot: 1,
            value: 'encrypted-value-1',
            checksum: 'different-checksum'
          }, // Different checksum
          {
            slot: 2,
            value: 'encrypted-value-2',
            checksum: anotherUnchangedValueChecksum
          } // Same checksum
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'checksum-test-secret',
        comment: 'Testing checksum comparison',
        secret_slots: [
          { slot: 1, value: 'changed-value' } // Only the slot with different checksum
        ]
      })
    })

    it('includes new slots that do not exist in existing secret', () => {
      const secretResource: SecretResource = {
        name: 'new-slots-secret',
        comment: 'Adding new slots',
        secret_slots: [
          { slot: 0, value: 'existing-unchanged' },
          { slot: 1, value: 'existing-changed' },
          { slot: 5, value: 'completely-new-slot' } // New slot
        ]
      }

      const existingUnchangedChecksum = crypto
        .createHash('sha256')
        .update('existing-unchanged')
        .digest('hex')

      const existingSecret: GetSecretResponse = {
        id: 789,
        name: 'new-slots-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          {
            slot: 0,
            value: 'encrypted-value-0',
            checksum: existingUnchangedChecksum
          },
          {
            slot: 1,
            value: 'encrypted-value-1',
            checksum: 'different-checksum'
          }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'new-slots-secret',
        comment: 'Adding new slots',
        secret_slots: [
          { slot: 1, value: 'existing-changed' }, // Changed existing slot
          { slot: 5, value: 'completely-new-slot' } // New slot
        ]
      })
    })

    it('handles slots with undefined or empty values by logging warning and excluding them', () => {
      const secretResource: SecretResource = {
        name: 'warning-test-secret',
        comment: 'Testing warning scenarios',
        secret_slots: [
          { slot: 0, value: 'valid-value' },
          { slot: 1, value: '' }, // Empty value
          { slot: 2, value: 'another-valid-value' }
        ]
      }

      const validValueChecksum = crypto
        .createHash('sha256')
        .update('another-valid-value')
        .digest('hex')

      const existingSecret: GetSecretResponse = {
        id: 111,
        name: 'warning-test-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          {
            slot: 0,
            value: 'encrypted-value-0',
            checksum: 'different-checksum'
          },
          { slot: 1, value: 'encrypted-value-1', checksum: 'some-checksum' },
          { slot: 2, value: 'encrypted-value-2', checksum: validValueChecksum }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'warning-test-secret',
        comment: 'Testing warning scenarios',
        secret_slots: [
          { slot: 0, value: 'valid-value' } // Only valid values with different checksums
        ]
      })

      expect(mockWarning).toHaveBeenCalledWith(
        'Secret "warning-test-secret" slot: 1 has no value, skipping!'
      )
    })

    it('returns only deletion markers when all new values match existing checksums', () => {
      const secretResource: SecretResource = {
        name: 'all-unchanged-secret',
        comment: 'All values unchanged',
        secret_slots: [
          { slot: 0, value: 'unchanged-value-0' },
          { slot: 2, value: 'unchanged-value-2' }
        ]
      }

      const checksum0 = crypto
        .createHash('sha256')
        .update('unchanged-value-0')
        .digest('hex')
      const checksum2 = crypto
        .createHash('sha256')
        .update('unchanged-value-2')
        .digest('hex')

      const existingSecret: GetSecretResponse = {
        id: 222,
        name: 'all-unchanged-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'encrypted-value-0', checksum: checksum0 },
          { slot: 1, value: 'encrypted-value-1', checksum: 'checksum-1' },
          { slot: 2, value: 'encrypted-value-2', checksum: checksum2 },
          { slot: 3, value: 'encrypted-value-3', checksum: 'checksum-3' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'all-unchanged-secret',
        comment: 'All values unchanged',
        secret_slots: [
          { slot: 1 }, // Marked for deletion
          { slot: 3 } // Marked for deletion
        ]
      })
    })

    it('handles empty existing secret slots', () => {
      const secretResource: SecretResource = {
        name: 'new-secret',
        comment: 'First time with slots',
        secret_slots: [{ slot: 0, value: 'first-value' }]
      }

      const existingSecret: GetSecretResponse = {
        id: 333,
        name: 'new-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: []
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'new-secret',
        comment: 'First time with slots',
        secret_slots: [{ slot: 0, value: 'first-value' }]
      })
    })

    it('handles empty new resource slots with existing slots', () => {
      const secretResource: SecretResource = {
        name: 'clearing-secret',
        comment: 'Removing all slots',
        secret_slots: []
      }

      const existingSecret: GetSecretResponse = {
        id: 444,
        name: 'clearing-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'to-be-deleted', checksum: 'checksum-0' },
          { slot: 1, value: 'also-to-be-deleted', checksum: 'checksum-1' },
          { slot: 3, value: 'this-too', checksum: 'checksum-3' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'clearing-secret',
        comment: 'Removing all slots',
        secret_slots: [
          { slot: 0 }, // Marked for deletion
          { slot: 1 }, // Marked for deletion
          { slot: 3 } // Marked for deletion
        ]
      })
    })

    it('handles mixed scenario with checksums - some unchanged, some updated, some deleted, some added', () => {
      const secretResource: SecretResource = {
        name: 'complex-checksum-secret',
        comment: 'Complex checksum scenario',
        secret_slots: [
          { slot: 0, value: 'unchanged-value-0' }, // Unchanged (same checksum)
          { slot: 1, value: 'updated-value-1' }, // Updated (different checksum)
          { slot: 4, value: 'new-value-4' } // New slot
          // slot 2 and 3 will be deleted
        ]
      }

      const unchangedChecksum = crypto
        .createHash('sha256')
        .update('unchanged-value-0')
        .digest('hex')

      const existingSecret: GetSecretResponse = {
        id: 555,
        name: 'complex-checksum-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'encrypted-value-0', checksum: unchangedChecksum }, // Same checksum
          { slot: 1, value: 'encrypted-value-1', checksum: 'old-checksum-1' }, // Different checksum
          { slot: 2, value: 'to-be-deleted', checksum: 'checksum-2' },
          { slot: 3, value: 'also-to-be-deleted', checksum: 'checksum-3' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'complex-checksum-secret',
        comment: 'Complex checksum scenario',
        secret_slots: [
          { slot: 1, value: 'updated-value-1' }, // Updated (different checksum)
          { slot: 4, value: 'new-value-4' }, // New slot
          { slot: 2 }, // Marked for deletion
          { slot: 3 } // Marked for deletion
          // slot 0 is excluded because checksum matches
        ]
      })
    })

    it('handles existing slots without checksum property', () => {
      const secretResource: SecretResource = {
        name: 'no-checksum-secret',
        comment: 'Testing slots without checksums',
        secret_slots: [
          { slot: 0, value: 'some-value' },
          { slot: 1, value: 'another-value' }
        ]
      }

      const existingSecret: GetSecretResponse = {
        id: 666,
        name: 'no-checksum-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'encrypted-value-0' }, // No checksum property
          { slot: 1, value: 'encrypted-value-1', checksum: 'some-checksum' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'no-checksum-secret',
        comment: 'Testing slots without checksums',
        secret_slots: [
          { slot: 0, value: 'some-value' }, // Included because no checksum to compare
          { slot: 1, value: 'another-value' } // Included because checksum differs
        ]
      })
    })

    it('preserves other resource properties unchanged', () => {
      const secretResource: SecretResource = {
        name: 'property-test-secret',
        comment: 'Testing property preservation',
        secret_slots: [{ slot: 0, value: 'test-value' }]
      }

      const testValueChecksum = crypto
        .createHash('sha256')
        .update('test-value')
        .digest('hex')

      const existingSecret: GetSecretResponse = {
        id: 777,
        name: 'property-test-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'encrypted-value', checksum: testValueChecksum },
          { slot: 1, value: 'to-delete', checksum: 'checksum-1' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      // Verify that name and comment are preserved exactly
      expect(result.name).toBe(secretResource.name)
      expect(result.comment).toBe(secretResource.comment)
      expect(result.secret_slots).toHaveLength(1)
      expect(result.secret_slots[0]).toEqual({ slot: 1 }) // Only deletion marker
    })

    it('handles SHA-256 checksum calculation correctly', () => {
      const testValue = 'test-secret-value-123'
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(testValue)
        .digest('hex')

      const secretResource: SecretResource = {
        name: 'sha256-test-secret',
        comment: 'Testing SHA-256 checksums',
        secret_slots: [{ slot: 0, value: testValue }]
      }

      const existingSecret: GetSecretResponse = {
        id: 888,
        name: 'sha256-test-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'encrypted-value', checksum: expectedChecksum }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      // Should exclude the slot because checksums match
      expect(result).toEqual({
        name: 'sha256-test-secret',
        comment: 'Testing SHA-256 checksums',
        secret_slots: []
      })
    })
  })

  describe('isUpdateNeeded', () => {
    it('returns true when secret name has changed', () => {
      const secretResource: SecretResource = {
        name: 'new-secret-name',
        comment: 'Same comment',
        secret_slots: []
      }

      const existingSecret: GetSecretResponse = {
        id: 123,
        name: 'old-secret-name',
        comment: 'Same comment',
        app_count: 1,
        secret_slots: []
      }

      const result = isUpdateNeeded(secretResource, existingSecret)
      expect(result).toBe(true)
    })

    it('returns true when secret comment has changed', () => {
      const secretResource: SecretResource = {
        name: 'same-secret-name',
        comment: 'Updated comment',
        secret_slots: []
      }

      const existingSecret: GetSecretResponse = {
        id: 123,
        name: 'same-secret-name',
        comment: 'Original comment',
        app_count: 1,
        secret_slots: []
      }

      const result = isUpdateNeeded(secretResource, existingSecret)
      expect(result).toBe(true)
    })

    it('returns true when both name and comment have changed', () => {
      const secretResource: SecretResource = {
        name: 'new-name',
        comment: 'new-comment',
        secret_slots: []
      }

      const existingSecret: GetSecretResponse = {
        id: 123,
        name: 'old-name',
        comment: 'old-comment',
        app_count: 1,
        secret_slots: []
      }

      const result = isUpdateNeeded(secretResource, existingSecret)
      expect(result).toBe(true)
    })

    it('returns true when there is valid slot info', () => {
      const secretResource: SecretResource = {
        name: 'same-name',
        comment: 'same-comment',
        secret_slots: [
          { slot: 0, value: 'existing-value' },
          { slot: 1, value: 'new-slot-value' } // New slot
        ]
      }

      const existingValueChecksum = crypto
        .createHash('sha256')
        .update('existing-value')
        .digest('hex')

      const existingSecret: GetSecretResponse = {
        id: 123,
        name: 'same-name',
        comment: 'same-comment',
        app_count: 1,
        secret_slots: [
          {
            slot: 0,
            value: 'encrypted-existing-value',
            checksum: existingValueChecksum
          }
        ]
      }

      const result = isUpdateNeeded(secretResource, existingSecret)
      expect(result).toBe(true)
    })

    it('returns false when no changes are needed', () => {
      const secretResource: SecretResource = {
        name: 'unchanged-secret',
        comment: 'unchanged-comment',
        secret_slots: []
      }

      const existingValueChecksum = crypto
        .createHash('sha256')
        .update('existing-value')
        .digest('hex')

      const existingSecret: GetSecretResponse = {
        id: 123,
        name: 'unchanged-secret',
        comment: 'unchanged-comment',
        app_count: 1,
        secret_slots: [
          {
            slot: 0,
            value: 'encrypted-existing-value',
            checksum: existingValueChecksum
          }
        ]
      }

      const result = isUpdateNeeded(secretResource, existingSecret)
      expect(result).toBe(false)
    })
  })
})
