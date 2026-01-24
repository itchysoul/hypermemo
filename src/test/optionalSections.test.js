import { describe, it, expect } from 'vitest'
import {
  removeOptionalSections,
  parseContentWithOptional,
  parseCouplets,
  parseTextIntoTokens
} from '../utils/parsing'

describe('removeOptionalSections - edge cases', () => {
  it('handles nested-looking content (not actually nested)', () => {
    const text = 'A [OPTIONAL]B [OPTIONAL] C[/OPTIONAL] D'
    const result = removeOptionalSections(text)
    expect(result).toBe('A  D')
  })

  it('handles optional at start of text', () => {
    const text = '[OPTIONAL]hidden[/OPTIONAL]visible'
    const result = removeOptionalSections(text)
    expect(result).toBe('visible')
  })

  it('handles optional at end of text', () => {
    const text = 'visible[OPTIONAL]hidden[/OPTIONAL]'
    const result = removeOptionalSections(text)
    expect(result).toBe('visible')
  })

  it('handles only optional content', () => {
    const text = '[OPTIONAL]all hidden[/OPTIONAL]'
    const result = removeOptionalSections(text)
    expect(result).toBe('')
  })

  it('preserves whitespace outside optional sections', () => {
    const text = '  before  [OPTIONAL]hidden[/OPTIONAL]  after  '
    const result = removeOptionalSections(text)
    expect(result).toBe('  before    after  ')
  })

  it('handles special characters in optional content', () => {
    const text = 'keep [OPTIONAL]!@#$%^&*()[/OPTIONAL] this'
    const result = removeOptionalSections(text)
    expect(result).toBe('keep  this')
  })
})

describe('parseContentWithOptional', () => {
  it('identifies optional and non-optional parts', () => {
    const text = 'before [OPTIONAL]middle[/OPTIONAL] after'
    const parts = parseContentWithOptional(text)
    expect(parts.length).toBe(3)
    expect(parts[0]).toEqual({ content: 'before ', optional: false })
    expect(parts[1]).toEqual({ content: 'middle', optional: true })
    expect(parts[2]).toEqual({ content: ' after', optional: false })
  })

  it('handles text with no optional sections', () => {
    const text = 'no optional here'
    const parts = parseContentWithOptional(text)
    expect(parts.length).toBe(1)
    expect(parts[0]).toEqual({ content: 'no optional here', optional: false })
  })

  it('handles multiple optional sections', () => {
    const text = 'A [OPTIONAL]B[/OPTIONAL] C [OPTIONAL]D[/OPTIONAL] E'
    const parts = parseContentWithOptional(text)
    expect(parts.length).toBe(5)
    expect(parts.filter(p => p.optional)).toHaveLength(2)
  })

  it('handles adjacent optional sections', () => {
    const text = '[OPTIONAL]A[/OPTIONAL][OPTIONAL]B[/OPTIONAL]'
    const parts = parseContentWithOptional(text)
    expect(parts.length).toBe(2)
    expect(parts[0].content).toBe('A')
    expect(parts[1].content).toBe('B')
  })

  it('preserves multiline content in optional sections', () => {
    const text = `before
[OPTIONAL]
line1
line2
[/OPTIONAL]
after`
    const parts = parseContentWithOptional(text)
    const optionalPart = parts.find(p => p.optional)
    expect(optionalPart.content).toContain('line1')
    expect(optionalPart.content).toContain('line2')
  })
})

describe('parseCouplets with optional content', () => {
  it('filters out OPTIONAL markers from line count', () => {
    const text = `Line one
Line two
[OPTIONAL]
Optional one
Optional two
[/OPTIONAL]
Line three
Line four`
    const couplets = parseCouplets(text)
    const markerCouplet = couplets.find(c => 
      c.content.includes('[OPTIONAL]') || c.content.includes('[/OPTIONAL]')
    )
    expect(markerCouplet).toBeUndefined()
  })

  it('correctly counts couplets excluding markers', () => {
    const text = `A
B
[OPTIONAL]
C
D
[/OPTIONAL]
E
F`
    const couplets = parseCouplets(text)
    expect(couplets.filter(c => c.isCouplet).length).toBe(3)
  })
})

describe('Integration: optional sections with word counting', () => {
  it('word count changes when optional sections removed', () => {
    const fullText = 'keep this [OPTIONAL]remove these words[/OPTIONAL] and this'
    const withoutOptional = removeOptionalSections(fullText)
    
    const fullTokens = parseTextIntoTokens(fullText.replace(/\[OPTIONAL\]/g, '').replace(/\[\/OPTIONAL\]/g, ''))
    const reducedTokens = parseTextIntoTokens(withoutOptional)
    
    const fullWordCount = fullTokens.filter(t => t.type === 'word').length
    const reducedWordCount = reducedTokens.filter(t => t.type === 'word').length
    
    expect(fullWordCount).toBeGreaterThan(reducedWordCount)
  })

  it('Hamlet optional section contains significant content', () => {
    const hamletOptional = `For who would bear the whips and scorns of time,
Th'oppressor's wrong, the proud man's contumely,
The pangs of dispriz'd love, the law's delay,
The insolence of office, and the spurns
That patient merit of th'unworthy takes,
When he himself might his quietus make
With a bare bodkin? Who would fardels bear,
To grunt and sweat under a weary life,`
    
    const tokens = parseTextIntoTokens(hamletOptional)
    const wordCount = tokens.filter(t => t.type === 'word').length
    
    expect(wordCount).toBeGreaterThan(50)
  })
})
