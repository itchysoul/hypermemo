import { describe, it, expect } from 'vitest'
import { parseTextIntoTokens, getWordIndicesForVerse } from '../utils/parsing'
import { selectWordsToDelete, addMoreDeletions, removeDeletions } from '../utils/wordSelection'

describe('selectWordsToDelete', () => {
  it('always selects at least 2 words', () => {
    const tokens = parseTextIntoTokens('one two three four five')
    const indices = selectWordsToDelete(tokens, 1, 5)
    expect(indices.length).toBeGreaterThanOrEqual(2)
  })

  it('returns sorted indices', () => {
    const tokens = parseTextIntoTokens('one two three four five six seven eight nine ten')
    const indices = selectWordsToDelete(tokens, 50, 10)
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1])
    }
  })

  it('never returns duplicate indices', () => {
    const tokens = parseTextIntoTokens('one two three four five six seven eight nine ten')
    const indices = selectWordsToDelete(tokens, 50, 10)
    const uniqueIndices = new Set(indices)
    expect(uniqueIndices.size).toBe(indices.length)
  })

  it('is deterministic with same percentage', () => {
    const tokens = parseTextIntoTokens('one two three four five six seven eight nine ten')
    const indices1 = selectWordsToDelete(tokens, 30, 10)
    const indices2 = selectWordsToDelete(tokens, 30, 10)
    expect(indices1).toEqual(indices2)
  })

  it('produces different results with different percentages', () => {
    const tokens = parseTextIntoTokens('one two three four five six seven eight nine ten')
    const indices1 = selectWordsToDelete(tokens, 30, 10)
    const indices2 = selectWordsToDelete(tokens, 40, 10)
    expect(indices1).not.toEqual(indices2)
  })

  it('respects percentage approximately', () => {
    const tokens = parseTextIntoTokens('one two three four five six seven eight nine ten')
    const indices = selectWordsToDelete(tokens, 50, 10)
    expect(indices.length).toBe(5)
  })

  it('handles 100% deletion', () => {
    const tokens = parseTextIntoTokens('one two three four five')
    const indices = selectWordsToDelete(tokens, 100, 5)
    expect(indices.length).toBe(5)
  })

  it('handles empty text', () => {
    const tokens = parseTextIntoTokens('')
    const indices = selectWordsToDelete(tokens, 50, 0)
    expect(indices).toEqual([])
  })
})

describe('addMoreDeletions', () => {
  it('adds deletions up to target count', () => {
    const tokens = parseTextIntoTokens('one two three four five')
    const current = [0, 1]
    const newIndices = addMoreDeletions(tokens, current, 4, 5)
    expect(newIndices.length).toBe(4)
  })

  it('preserves existing deletions', () => {
    const tokens = parseTextIntoTokens('one two three four five')
    const current = [0, 2]
    const newIndices = addMoreDeletions(tokens, current, 4, 5)
    expect(newIndices).toContain(0)
    expect(newIndices).toContain(2)
  })

  it('does not exceed available words', () => {
    const tokens = parseTextIntoTokens('one two three')
    const current = [0, 1]
    const newIndices = addMoreDeletions(tokens, current, 10, 3)
    expect(newIndices.length).toBe(3)
  })

  it('returns sorted indices', () => {
    const tokens = parseTextIntoTokens('one two three four five six seven eight')
    const current = [5]
    const newIndices = addMoreDeletions(tokens, current, 4, 8)
    for (let i = 1; i < newIndices.length; i++) {
      expect(newIndices[i]).toBeGreaterThan(newIndices[i - 1])
    }
  })

  it('does nothing if already at target', () => {
    const tokens = parseTextIntoTokens('one two three')
    const current = [0, 1, 2]
    const newIndices = addMoreDeletions(tokens, current, 3, 3)
    expect(newIndices).toEqual([0, 1, 2])
  })
})

describe('removeDeletions', () => {
  it('removes deletions down to target count', () => {
    const current = [0, 1, 2, 3, 4]
    const newIndices = removeDeletions(current, 3)
    expect(newIndices.length).toBe(3)
  })

  it('returns sorted indices', () => {
    const current = [0, 1, 2, 3, 4, 5, 6, 7]
    const newIndices = removeDeletions(current, 4)
    for (let i = 1; i < newIndices.length; i++) {
      expect(newIndices[i]).toBeGreaterThan(newIndices[i - 1])
    }
  })

  it('does nothing if target exceeds current', () => {
    const current = [0, 1, 2]
    const newIndices = removeDeletions(current, 5)
    expect(newIndices).toEqual([0, 1, 2])
  })

  it('handles empty array', () => {
    const current = []
    const newIndices = removeDeletions(current, 2)
    expect(newIndices).toEqual([])
  })
})

describe('getWordIndicesForVerse', () => {
  it('finds word indices for a verse', () => {
    const fullText = 'Title\n1 First verse content\n2 Second verse'
    const tokens = parseTextIntoTokens(fullText)
    const indices = getWordIndicesForVerse(tokens, 'First verse content')
    expect(indices.length).toBe(3)
  })

  it('respects startSearchIndex', () => {
    const fullText = 'love love love'
    const tokens = parseTextIntoTokens(fullText)
    const indices = getWordIndicesForVerse(tokens, 'love', 1)
    expect(indices).toEqual([1])
  })

  it('handles verse not found', () => {
    const fullText = 'hello world'
    const tokens = parseTextIntoTokens(fullText)
    const indices = getWordIndicesForVerse(tokens, 'goodbye')
    expect(indices).toEqual([])
  })

  it('matches words in sequence', () => {
    const fullText = 'the quick brown fox jumps over the lazy dog'
    const tokens = parseTextIntoTokens(fullText)
    const indices = getWordIndicesForVerse(tokens, 'quick brown fox')
    expect(indices).toEqual([1, 2, 3])
  })
})
