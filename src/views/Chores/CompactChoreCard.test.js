import { describe, expect, it } from 'vitest'

import { getCompactChoreMetadataParts } from './compactChoreMetadata'

describe('getCompactChoreMetadataParts', () => {
  it('omits assignee metadata when performers are not available yet', () => {
    const chore = {
      frequencyType: 'once',
      assignedTo: 42,
      points: 5,
    }

    const result = getCompactChoreMetadataParts(chore, undefined, key => key)

    expect(result).toBe('5pts')
  })

  it('includes the assignee name when it is available', () => {
    const chore = {
      frequencyType: 'once',
      assignedTo: 42,
      points: 5,
    }

    const result = getCompactChoreMetadataParts(
      chore,
      [{ userId: 42, displayName: 'Alice' }],
      key => key,
    )

    expect(result).toBe('Alice • 5pts')
  })
})
