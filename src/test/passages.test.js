import { describe, it, expect } from 'vitest'
import { PASSAGES } from '../passages'

describe('PASSAGES data', () => {
  it('contains at least two passages', () => {
    expect(PASSAGES.length).toBeGreaterThanOrEqual(2)
  })

  it('has unique IDs for all passages', () => {
    const ids = PASSAGES.map(p => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('each passage has required fields', () => {
    PASSAGES.forEach(passage => {
      expect(passage).toHaveProperty('id')
      expect(passage).toHaveProperty('type')
      expect(passage).toHaveProperty('title')
      expect(passage).toHaveProperty('subtitle')
      expect(passage).toHaveProperty('content')
      expect(typeof passage.id).toBe('number')
      expect(['scripture', 'poetry']).toContain(passage.type)
    })
  })

  describe('scripture passage', () => {
    const scripture = PASSAGES.find(p => p.type === 'scripture')

    it('exists', () => {
      expect(scripture).toBeDefined()
    })

    it('has numbered verses', () => {
      expect(scripture.content).toMatch(/^\d+\s/m)
    })

    it('does not contain OPTIONAL markers', () => {
      expect(scripture.content).not.toContain('[OPTIONAL]')
    })
  })

  describe('poetry passage', () => {
    const poetry = PASSAGES.find(p => p.type === 'poetry')

    it('exists', () => {
      expect(poetry).toBeDefined()
    })

    it('has introduction field', () => {
      expect(poetry).toHaveProperty('introduction')
      expect(poetry.introduction.length).toBeGreaterThan(0)
    })

    it('contains OPTIONAL markers', () => {
      expect(poetry.content).toContain('[OPTIONAL]')
      expect(poetry.content).toContain('[/OPTIONAL]')
    })

    it('has balanced OPTIONAL markers', () => {
      const openCount = (poetry.content.match(/\[OPTIONAL\]/g) || []).length
      const closeCount = (poetry.content.match(/\[\/OPTIONAL\]/g) || []).length
      expect(openCount).toBe(closeCount)
    })
  })
})

describe('Hamlet passage specifics', () => {
  const hamlet = PASSAGES.find(p => p.subtitle === 'Hamlet Act 3, Scene 1')

  it('contains the famous opening line', () => {
    expect(hamlet.content).toContain('To be, or not to be')
  })

  it('contains "mortal coil" reference', () => {
    expect(hamlet.content).toContain('mortal coil')
  })

  it('optional section contains "whips and scorns"', () => {
    const optionalMatch = hamlet.content.match(/\[OPTIONAL\]([\s\S]*?)\[\/OPTIONAL\]/)
    expect(optionalMatch).toBeTruthy()
    expect(optionalMatch[1]).toContain('whips and scorns')
  })

  it('ends with "lose the name of action"', () => {
    const trimmed = hamlet.content.trim()
    expect(trimmed).toMatch(/lose the name of action\.?$/)
  })
})

describe('1 Corinthians 13 passage specifics', () => {
  const corinthians = PASSAGES.find(p => p.subtitle === '1 Corinthians 13')

  it('contains verse 13 about faith, hope, love', () => {
    expect(corinthians.content).toContain('faith, hope, love')
  })

  it('contains "greatest of these is love"', () => {
    expect(corinthians.content).toContain('greatest of these is love')
  })

  it('has verses numbered 1 through 13', () => {
    for (let i = 1; i <= 13; i++) {
      const regex = new RegExp(`^${i}\\s`, 'm')
      expect(corinthians.content).toMatch(regex)
    }
  })
})
