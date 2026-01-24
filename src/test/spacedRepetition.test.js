import { describe, it, expect } from 'vitest'

function getNextInterval(quality, currentInterval) {
  const baseIntervals = [0, 60000, 120000, 300000, 600000, 1200000, 1800000]
  let intervalIndex = baseIntervals.findIndex(i => i >= currentInterval)
  if (intervalIndex === -1) intervalIndex = baseIntervals.length - 1
  
  if (quality === 'again') {
    return 60000
  } else if (quality === 'hard') {
    return baseIntervals[Math.max(0, intervalIndex)]
  } else {
    return baseIntervals[Math.min(baseIntervals.length - 1, intervalIndex + 1)]
  }
}

function formatTimeUntil(ms) {
  if (ms <= 0) return 'now'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

describe('getNextInterval', () => {
  it('returns 60000ms (1 min) for "again" regardless of current interval', () => {
    expect(getNextInterval('again', 0)).toBe(60000)
    expect(getNextInterval('again', 120000)).toBe(60000)
    expect(getNextInterval('again', 1800000)).toBe(60000)
  })

  it('keeps same interval for "hard"', () => {
    expect(getNextInterval('hard', 120000)).toBe(120000)
  })

  it('increases interval for "easy"', () => {
    const current = 120000
    const next = getNextInterval('easy', current)
    expect(next).toBeGreaterThan(current)
  })

  it('caps interval at maximum (30 minutes)', () => {
    const maxInterval = 1800000
    const next = getNextInterval('easy', maxInterval)
    expect(next).toBe(maxInterval)
  })

  it('progresses through intervals correctly for easy', () => {
    let interval = 0
    const intervals = [interval]
    
    for (let i = 0; i < 6; i++) {
      interval = getNextInterval('easy', interval)
      intervals.push(interval)
    }
    
    for (let i = 1; i < intervals.length - 1; i++) {
      expect(intervals[i]).toBeLessThanOrEqual(intervals[i + 1])
    }
  })

  it('handles unknown quality as easy', () => {
    const result = getNextInterval('unknown', 120000)
    expect(result).toBeGreaterThanOrEqual(120000)
  })
})

describe('formatTimeUntil', () => {
  it('returns "now" for zero or negative values', () => {
    expect(formatTimeUntil(0)).toBe('now')
    expect(formatTimeUntil(-1000)).toBe('now')
  })

  it('formats seconds correctly', () => {
    expect(formatTimeUntil(30000)).toBe('30s')
    expect(formatTimeUntil(45000)).toBe('45s')
  })

  it('formats minutes and seconds correctly', () => {
    expect(formatTimeUntil(90000)).toBe('1m 30s')
    expect(formatTimeUntil(125000)).toBe('2m 5s')
  })

  it('handles exact minutes', () => {
    expect(formatTimeUntil(60000)).toBe('1m 0s')
    expect(formatTimeUntil(120000)).toBe('2m 0s')
  })

  it('handles large values', () => {
    expect(formatTimeUntil(1800000)).toBe('30m 0s')
  })
})

describe('Spaced Repetition Workflow', () => {
  it('simulates a complete review cycle', () => {
    const verseProgress = {}
    const verseNum = 1
    
    verseProgress[verseNum] = { completions: 1, interval: 0, nextReview: null }
    expect(verseProgress[verseNum].completions).toBe(1)
    
    verseProgress[verseNum].completions = 2
    verseProgress[verseNum].interval = 120000
    verseProgress[verseNum].nextReview = Date.now() + 120000
    
    expect(verseProgress[verseNum].nextReview).toBeGreaterThan(Date.now())
    
    const newInterval = getNextInterval('easy', verseProgress[verseNum].interval)
    expect(newInterval).toBeGreaterThan(verseProgress[verseNum].interval)
  })

  it('handles multiple verses with different progress', () => {
    const verseProgress = {
      1: { completions: 5, interval: 600000, nextReview: Date.now() - 1000 },
      2: { completions: 2, interval: 120000, nextReview: Date.now() + 60000 },
      3: { completions: 1, interval: 0, nextReview: null }
    }
    
    const dueReviews = Object.entries(verseProgress)
      .filter(([_, p]) => p.nextReview && p.nextReview <= Date.now() && p.completions >= 2)
      .map(([verseNum]) => parseInt(verseNum))
    
    expect(dueReviews).toContain(1)
    expect(dueReviews).not.toContain(2)
    expect(dueReviews).not.toContain(3)
  })

  it('calculates due reviews sorted by due time', () => {
    const now = Date.now()
    const verseProgress = {
      1: { completions: 3, interval: 300000, nextReview: now - 5000 },
      2: { completions: 2, interval: 120000, nextReview: now - 10000 },
      3: { completions: 4, interval: 600000, nextReview: now - 2000 }
    }
    
    const dueReviews = Object.entries(verseProgress)
      .filter(([_, p]) => p.nextReview && p.nextReview <= now && p.completions >= 2)
      .map(([verseNum, p]) => ({ verseNum: parseInt(verseNum), dueTime: p.nextReview }))
      .sort((a, b) => a.dueTime - b.dueTime)
      .map(item => item.verseNum)
    
    expect(dueReviews[0]).toBe(2)
    expect(dueReviews[1]).toBe(1)
    expect(dueReviews[2]).toBe(3)
  })
})
