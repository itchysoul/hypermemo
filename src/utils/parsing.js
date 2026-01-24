/**
 * Text parsing utilities for cloze deletion app
 */

export const OPTIONAL_OPEN = '[OPTIONAL]'
export const OPTIONAL_CLOSE = '[/OPTIONAL]'
const OPTIONAL_REGEX = /\[OPTIONAL\][\s\S]*?\[\/OPTIONAL\]/g
const OPTIONAL_CAPTURE_REGEX = /\[OPTIONAL\]([\s\S]*?)\[\/OPTIONAL\]/g

/**
 * Parse text into tokens (words and non-words)
 * @param {string} text - The text to parse
 * @returns {Array<{type: 'word'|'other', value: string, wordIndex?: number}>}
 */
export function parseTextIntoTokens(text) {
  const tokens = []
  const regex = /([a-zA-Z]+(?:'[a-zA-Z]+)?)|([^a-zA-Z]+)/g
  let match
  let wordIndex = 0
  
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      tokens.push({ type: 'word', value: match[1], wordIndex: wordIndex++ })
    } else {
      tokens.push({ type: 'other', value: match[2] })
    }
  }
  
  return tokens
}

/**
 * Remove optional sections from text
 * @param {string} text - Text containing [OPTIONAL]...[/OPTIONAL] markers
 * @returns {string} Text with optional sections removed
 */
export function removeOptionalSections(text) {
  return text.replace(OPTIONAL_REGEX, '')
}

/**
 * Strip optional markers but keep content
 * @param {string} text - Text containing optional markers
 * @returns {string} Text with markers removed but content preserved
 */
export function stripOptionalMarkers(text) {
  return text.replace(/\[OPTIONAL\]/g, '').replace(/\[\/OPTIONAL\]/g, '')
}

/**
 * Parse text into optional and non-optional parts
 * @param {string} text - Text to parse
 * @returns {Array<{content: string, optional: boolean}>}
 */
export function parseContentWithOptional(text) {
  const parts = []
  let lastIndex = 0
  let match
  
  while ((match = OPTIONAL_CAPTURE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ content: text.slice(lastIndex, match.index), optional: false })
    }
    parts.push({ content: match[1], optional: true })
    lastIndex = match.index + match[0].length
  }
  
  if (lastIndex < text.length) {
    parts.push({ content: text.slice(lastIndex), optional: false })
  }
  
  return parts
}

/**
 * Check if text contains optional sections
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export function hasOptionalSections(text) {
  return text.includes(OPTIONAL_OPEN)
}

/**
 * Parse scripture text into verses
 * @param {string} text - Scripture text with numbered verses
 * @returns {Array<{number: number, content: string, isTitle?: boolean}>}
 */
export function parseScriptureVerses(text) {
  const lines = text.split('\n')
  const verses = []
  let currentVerse = null
  let currentContent = []
  
  for (const line of lines) {
    const verseMatch = line.match(/^(\d+)\s/)
    if (verseMatch) {
      if (currentVerse !== null) {
        verses.push({ number: currentVerse, content: currentContent.join('\n') })
      }
      currentVerse = parseInt(verseMatch[1])
      currentContent = [line]
    } else if (currentVerse !== null) {
      currentContent.push(line)
    } else {
      if (verses.length === 0 && line.trim()) {
        verses.push({ number: 0, content: line, isTitle: true })
      }
    }
  }
  
  if (currentVerse !== null) {
    verses.push({ number: currentVerse, content: currentContent.join('\n') })
  }
  
  return verses
}

/**
 * Parse poetry text into couplets (pairs of lines)
 * @param {string} text - Poetry text
 * @returns {Array<{number: number, content: string, isTitle?: boolean, isCouplet?: boolean}>}
 */
export function parseCouplets(text) {
  const lines = text.split('\n').filter(line => {
    const trimmed = line.trim()
    return trimmed && 
           !trimmed.match(/^[A-Z].*Act \d+.*Scene \d+/) && 
           trimmed !== OPTIONAL_OPEN && 
           trimmed !== OPTIONAL_CLOSE
  })
  
  const couplets = []
  let coupletNum = 1
  let titleHandled = false
  
  for (let i = 0; i < lines.length; i += 2) {
    const line1 = lines[i]
    const line2 = lines[i + 1] || ''
    
    if (!titleHandled && i === 0) {
      titleHandled = true
      if (line1.match(/^[A-Z].*\d+/)) {
        couplets.push({ number: 0, content: line1, isTitle: true })
        i--
        continue
      }
    }
    
    const content = line2 ? `${line1}\n${line2}` : line1
    couplets.push({ number: coupletNum++, content, isCouplet: true })
  }
  
  return couplets
}

/**
 * Parse text into verses or couplets based on passage type
 * @param {string} text - Text to parse
 * @param {'scripture'|'poetry'} passageType - Type of passage
 * @returns {Array<{number: number, content: string, isTitle?: boolean, isCouplet?: boolean}>}
 */
export function parseVerses(text, passageType = 'scripture') {
  return passageType === 'poetry' ? parseCouplets(text) : parseScriptureVerses(text)
}

/**
 * Get word indices for a specific verse within tokenized text
 * @param {Array} tokens - Tokenized text
 * @param {string} verseContent - Content of the verse to find
 * @param {number} startSearchIndex - Index to start searching from
 * @returns {number[]} Array of word indices
 */
export function getWordIndicesForVerse(tokens, verseContent, startSearchIndex = 0) {
  const verseTokens = parseTextIntoTokens(verseContent)
  const verseWords = verseTokens.filter(t => t.type === 'word').map(t => t.value)
  
  const indices = []
  let verseWordIdx = 0
  
  for (let i = startSearchIndex; i < tokens.length && verseWordIdx < verseWords.length; i++) {
    const token = tokens[i]
    if (token.type === 'word' && token.value === verseWords[verseWordIdx]) {
      indices.push(token.wordIndex)
      verseWordIdx++
    }
  }
  
  return indices
}
