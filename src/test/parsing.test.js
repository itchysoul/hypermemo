import { describe, it, expect } from 'vitest'
import {
  parseTextIntoTokens,
  removeOptionalSections,
  parseCouplets,
  parseVerses
} from '../utils/parsing'

describe('parseTextIntoTokens', () => {
  it('parses simple text into word and other tokens', () => {
    const tokens = parseTextIntoTokens('Hello, world!')
    expect(tokens).toHaveLength(4)
    expect(tokens[0]).toEqual({ type: 'word', value: 'Hello', wordIndex: 0, bold: false, italic: false })
    expect(tokens[1]).toEqual({ type: 'other', value: ', ' })
    expect(tokens[2]).toEqual({ type: 'word', value: 'world', wordIndex: 1, bold: false, italic: false })
    expect(tokens[3]).toEqual({ type: 'other', value: '!' })
  })

  it('handles contractions as single words', () => {
    const tokens = parseTextIntoTokens("'tis a consummation")
    const words = tokens.filter(t => t.type === 'word')
    expect(words).toHaveLength(3)
    expect(words[0].value).toBe('tis')
    expect(words[1].value).toBe('a')
    expect(words[2].value).toBe('consummation')
  })

  it('assigns sequential wordIndex to each word', () => {
    const tokens = parseTextIntoTokens('one two three')
    const words = tokens.filter(t => t.type === 'word')
    expect(words[0].wordIndex).toBe(0)
    expect(words[1].wordIndex).toBe(1)
    expect(words[2].wordIndex).toBe(2)
  })

  it('detects bold markdown styling', () => {
    const tokens = parseTextIntoTokens('normal **bold** text')
    const words = tokens.filter(t => t.type === 'word')
    expect(words[0].bold).toBe(false)
    expect(words[1].bold).toBe(true)
    expect(words[2].bold).toBe(false)
  })

  it('detects italic markdown styling', () => {
    const tokens = parseTextIntoTokens('normal *italic* text')
    const words = tokens.filter(t => t.type === 'word')
    expect(words[0].italic).toBe(false)
    expect(words[1].italic).toBe(true)
    expect(words[2].italic).toBe(false)
  })
})

describe('removeOptionalSections', () => {
  it('removes optional sections from text', () => {
    const text = 'Start text [OPTIONAL]hidden content[/OPTIONAL] end text'
    const result = removeOptionalSections(text)
    expect(result).toBe('Start text  end text')
  })

  it('removes multiple optional sections', () => {
    const text = 'A [OPTIONAL]B[/OPTIONAL] C [OPTIONAL]D[/OPTIONAL] E'
    const result = removeOptionalSections(text)
    expect(result).toBe('A  C  E')
  })

  it('handles multiline optional sections', () => {
    const text = `Start
[OPTIONAL]
Line 1
Line 2
[/OPTIONAL]
End`
    const result = removeOptionalSections(text)
    expect(result).toBe(`Start

End`)
  })

  it('returns text unchanged if no optional sections', () => {
    const text = 'No optional content here'
    const result = removeOptionalSections(text)
    expect(result).toBe(text)
  })
})

describe('parseVerses (scripture)', () => {
  it('parses numbered verses', () => {
    const text = `1 First verse content
2 Second verse content`
    const verses = parseVerses(text, 'scripture')
    expect(verses).toHaveLength(2)
    expect(verses[0].number).toBe(1)
    expect(verses[1].number).toBe(2)
  })

  it('handles title before numbered verses', () => {
    const text = `Title Line

1 First verse`
    const verses = parseVerses(text, 'scripture')
    expect(verses[0].isTitle).toBe(true)
    expect(verses[0].content).toBe('Title Line')
    expect(verses[1].number).toBe(1)
  })

  it('handles multi-line verses', () => {
    const text = `1 First line of verse one
continues on second line
2 Second verse`
    const verses = parseVerses(text, 'scripture')
    expect(verses[0].content).toContain('continues on second line')
  })
})

describe('parseCouplets (poetry)', () => {
  it('groups lines into couplets of two', () => {
    const text = `Line one
Line two
Line three
Line four`
    const couplets = parseCouplets(text)
    expect(couplets).toHaveLength(2)
    expect(couplets[0].content).toBe('Line one\nLine two')
    expect(couplets[1].content).toBe('Line three\nLine four')
  })

  it('handles odd number of lines', () => {
    const text = `Line one
Line two
Line three`
    const couplets = parseCouplets(text)
    expect(couplets).toHaveLength(2)
    expect(couplets[1].content).toBe('Line three')
  })

  it('filters out OPTIONAL markers', () => {
    const text = `Line one
Line two
[OPTIONAL]
Line three
Line four
[/OPTIONAL]
Line five
Line six`
    const couplets = parseCouplets(text)
    const hasOptionalMarker = couplets.some(c => 
      c.content.includes('[OPTIONAL]') || c.content.includes('[/OPTIONAL]')
    )
    expect(hasOptionalMarker).toBe(false)
  })

  it('assigns sequential couplet numbers', () => {
    const text = `A
B
C
D`
    const couplets = parseCouplets(text)
    expect(couplets[0].number).toBe(1)
    expect(couplets[1].number).toBe(2)
  })
})

describe('parseVerses with passageType', () => {
  it('uses scripture parsing for scripture type', () => {
    const text = `1 Verse one
2 Verse two`
    const verses = parseVerses(text, 'scripture')
    expect(verses[0].number).toBe(1)
    expect(verses[1].number).toBe(2)
  })

  it('uses couplet parsing for poetry type', () => {
    const text = `Line one
Line two`
    const verses = parseVerses(text, 'poetry')
    expect(verses[0].isCouplet).toBe(true)
  })
})
