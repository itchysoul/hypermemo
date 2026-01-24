/**
 * Spaced repetition system utilities
 * Configurable intervals for short-term memorization sessions
 */

export const INTERVALS = {
  INITIAL: 0,
  AGAIN: 60000,        // 1 minute
  FIRST_REVIEW: 120000, // 2 minutes
  INTERVALS: [0, 60000, 120000, 300000, 600000, 1200000, 1800000], // 0, 1m, 2m, 5m, 10m, 20m, 30m
}

export const QUALITY = {
  AGAIN: 'again',
  HARD: 'hard',
  EASY: 'easy'
}

export const COMPLETIONS_FOR_REVIEW = 2

/**
 * Calculate next review interval based on quality response
 * @param {'again'|'hard'|'easy'} quality - Review quality
 * @param {number} currentInterval - Current interval in ms
 * @returns {number} Next interval in ms
 */
export function getNextInterval(quality, currentInterval) {
  const intervals = INTERVALS.INTERVALS
  let intervalIndex = intervals.findIndex(i => i >= currentInterval)
  if (intervalIndex === -1) intervalIndex = intervals.length - 1
  
  if (quality === QUALITY.AGAIN) {
    return INTERVALS.AGAIN
  } else if (quality === QUALITY.HARD) {
    return intervals[Math.max(0, intervalIndex)]
  } else {
    return intervals[Math.min(intervals.length - 1, intervalIndex + 1)]
  }
}

/**
 * Format milliseconds as human-readable time
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
export function formatTimeUntil(ms) {
  if (ms <= 0) return 'now'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Check if a verse is due for review
 * @param {Object} progress - Verse progress object
 * @param {number} now - Current timestamp
 * @returns {boolean}
 */
export function isVerseDue(progress, now) {
  return progress && 
         progress.nextReview && 
         progress.nextReview <= now && 
         progress.completions >= COMPLETIONS_FOR_REVIEW
}

/**
 * Get due reviews sorted by urgency (earliest first)
 * @param {Object} verseProgress - Map of verse number to progress
 * @param {number} now - Current timestamp
 * @returns {number[]} Array of verse numbers due for review
 */
export function getDueReviews(verseProgress, now) {
  return Object.entries(verseProgress)
    .filter(([_, p]) => isVerseDue(p, now))
    .map(([verseNum, p]) => ({ verseNum: parseInt(verseNum), dueTime: p.nextReview }))
    .sort((a, b) => a.dueTime - b.dueTime)
    .map(item => item.verseNum)
}

/**
 * Create initial verse progress after first completion
 * @returns {Object} Initial progress object
 */
export function createInitialProgress() {
  return {
    completions: 1,
    interval: 0,
    nextReview: null,
    lastCompleted: Date.now()
  }
}

/**
 * Update progress after completion
 * @param {Object} current - Current progress
 * @param {boolean} isReview - Whether this was a review
 * @param {'again'|'hard'|'easy'} quality - Review quality (only for reviews)
 * @returns {Object} Updated progress
 */
export function updateProgress(current, isReview = false, quality = QUALITY.EASY) {
  const completions = current.completions + 1
  let interval = current.interval
  let nextReview = null
  
  if (isReview) {
    interval = getNextInterval(quality, current.interval)
    nextReview = Date.now() + interval
  } else if (completions >= COMPLETIONS_FOR_REVIEW) {
    interval = completions === COMPLETIONS_FOR_REVIEW ? INTERVALS.FIRST_REVIEW : getNextInterval(QUALITY.EASY, current.interval)
    nextReview = Date.now() + interval
  }
  
  return {
    completions,
    interval,
    nextReview,
    lastCompleted: Date.now(),
    ...(isReview && { lastReviewed: Date.now() })
  }
}
