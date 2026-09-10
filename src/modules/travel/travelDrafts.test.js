import { describe, expect, it } from 'vitest'
import { acknowledgeTravelDraft, forgetTravelDraft, readTravelDraft, rememberTravelDraft } from './travelDrafts.js'

describe('Travel session draft recovery', () => {
  it('keeps unsaved input available when an editor is closed after failure', () => {
    const key = 'place:failed'
    rememberTravelDraft(key, { name: 'Edited' }, { name: 'Original' })
    expect(readTravelDraft(key)).toEqual({ value: { name: 'Edited' }, baseline: { name: 'Original' } })
    forgetTravelDraft(key)
    expect(readTravelDraft(key)).toBeUndefined()
  })
  it('does not clear newer input when an older save completes', () => {
    const key = 'trip:pending'
    rememberTravelDraft(key, { name: 'Newest' }, { name: 'Original' })
    acknowledgeTravelDraft(key, { name: 'Intermediate' })
    expect(readTravelDraft(key)).toEqual({ value: { name: 'Newest' }, baseline: { name: 'Intermediate' } })
    acknowledgeTravelDraft(key, { name: 'Newest' })
    expect(readTravelDraft(key)).toBeUndefined()
  })
})
