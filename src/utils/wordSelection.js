/**
 * Word selection and deletion utilities for cloze practice
 */

export const MIN_DELETED_WORDS = 2
export const PERCENTAGE_STEP = 5
export const VERSE_MODE_THRESHOLD = 50

/**
 * Deterministic seeded random number generator
 * @param {number} seed
 * @returns {number} Random number between 0 and 1
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/**
 * Select words to delete based on percentage (deterministic)
 * @param {Array} tokens - Tokenized text
 * @param {number} percentage - Percentage of words to delete
 * @param {number} totalWords - Total word count
 * @returns {number[]} Sorted array of word indices to delete
 */
export function selectWordsToDelete(tokens, percentage, totalWords) {
  const wordTokens = tokens.filter(t => t.type === 'word')
  const count = Math.max(MIN_DELETED_WORDS, Math.round(totalWords * (percentage / 100)))
  const actualCount = Math.min(count, wordTokens.length)
  
  const indices = []
  const available = wordTokens.map(t => t.wordIndex)
  
  for (let i = 0; i < actualCount && available.length > 0; i++) {
    const seed = i + percentage * 1000
    const randomIndex = Math.floor(seededRandom(seed) * available.length)
    indices.push(available[randomIndex])
    available.splice(randomIndex, 1)
  }
  
  return indices.sort((a, b) => a - b)
}

/**
 * Add more deletions to existing set (incremental harder)
 * @param {Array} tokens - Tokenized text
 * @param {number[]} currentIndices - Currently deleted indices
 * @param {number} targetCount - Target deletion count
 * @returns {number[]} Updated sorted deletion indices
 */
export function addMoreDeletions(tokens, currentIndices, targetCount) {
  const wordTokens = tokens.filter(t => t.type === 'word')
  const currentSet = new Set(currentIndices)
  const available = wordTokens.map(t => t.wordIndex).filter(i => !currentSet.has(i))
  
  const toAdd = Math.min(targetCount - currentIndices.length, available.length)
  if (toAdd <= 0) return [...currentIndices]
  
  const newIndices = [...currentIndices]
  
  for (let i = 0; i < toAdd && available.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * available.length)
    newIndices.push(available[randomIndex])
    available.splice(randomIndex, 1)
  }
  
  return newIndices.sort((a, b) => a - b)
}

/**
 * Remove deletions from existing set (incremental easier)
 * @param {number[]} currentIndices - Currently deleted indices
 * @param {number} targetCount - Target deletion count
 * @returns {number[]} Updated sorted deletion indices
 */
export function removeDeletions(currentIndices, targetCount) {
  if (targetCount >= currentIndices.length) return [...currentIndices]
  const toRemove = currentIndices.length - targetCount
  const shuffled = [...currentIndices].sort(() => Math.random() - 0.5)
  return shuffled.slice(toRemove).sort((a, b) => a - b)
}

/**
 * Calculate minimum percentage based on total words
 * @param {number} totalWords 
 * @returns {number} Minimum percentage
 */
export function calculateMinPercentage(totalWords) {
  if (totalWords === 0) return PERCENTAGE_STEP
  const minWords = Math.max(MIN_DELETED_WORDS, Math.min(10, Math.ceil(totalWords * 0.05)))
  return Math.max(PERCENTAGE_STEP, Math.ceil((minWords / totalWords) * 100))
}

/**
 * Calculate target deletion count for a percentage
 * @param {number} totalWords
 * @param {number} percentage
 * @returns {number}
 */
export function calculateDeletionCount(totalWords, percentage) {
  return Math.max(MIN_DELETED_WORDS, Math.round(totalWords * (percentage / 100)))
}
