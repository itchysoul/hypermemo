import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'

function ClozeWord({ word, isDeleted, showAll, isRevealed, wordRef }) {
  const [isHovered, setIsHovered] = useState(false)
  
  const getStateClasses = () => {
    if (isDeleted && !showAll && !isRevealed && !isHovered) return 'bg-gray-300'
    if (isDeleted && (showAll || isRevealed || isHovered)) return 'bg-green-200'
    return ''
  }
  
  if (!isDeleted) {
    return <span ref={wordRef}>{word}</span>
  }
  
  const revealed = showAll || isRevealed || isHovered
  
  return (
    <span
      ref={wordRef}
      data-testid="cloze-word"
      className={`inline-block px-1 rounded cursor-pointer transition-colors duration-200 relative ${getStateClasses()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={revealed ? 'text-green-900' : 'opacity-0 select-none'}>{word}</span>
      {!revealed && (
        <span className="absolute inset-0 flex items-center justify-center text-gray-400 select-none pointer-events-none">
          {'_'.repeat(word.length)}
        </span>
      )}
    </span>
  )
}

describe('ClozeWord Component', () => {
  it('renders non-deleted word without special styling', () => {
    render(<ClozeWord word="hello" isDeleted={false} showAll={false} isRevealed={false} />)
    const element = screen.getByText('hello')
    expect(element).toBeInTheDocument()
    expect(element).not.toHaveClass('bg-gray-300')
  })

  it('renders deleted word with hidden styling', () => {
    render(<ClozeWord word="hello" isDeleted={true} showAll={false} isRevealed={false} />)
    const element = screen.getByTestId('cloze-word')
    expect(element).toHaveClass('bg-gray-300')
  })

  it('shows word when showAll is true', () => {
    render(<ClozeWord word="hello" isDeleted={true} showAll={true} isRevealed={false} />)
    const element = screen.getByTestId('cloze-word')
    expect(element).toHaveClass('bg-green-200')
  })

  it('shows word when isRevealed is true', () => {
    render(<ClozeWord word="hello" isDeleted={true} showAll={false} isRevealed={true} />)
    const element = screen.getByTestId('cloze-word')
    expect(element).toHaveClass('bg-green-200')
  })

  it('reveals word on hover', () => {
    render(<ClozeWord word="hello" isDeleted={true} showAll={false} isRevealed={false} />)
    const element = screen.getByTestId('cloze-word')
    
    expect(element).toHaveClass('bg-gray-300')
    
    fireEvent.mouseEnter(element)
    expect(element).toHaveClass('bg-green-200')
    
    fireEvent.mouseLeave(element)
    expect(element).toHaveClass('bg-gray-300')
  })

  it('shows underscores for hidden words', () => {
    render(<ClozeWord word="test" isDeleted={true} showAll={false} isRevealed={false} />)
    expect(screen.getByText('____')).toBeInTheDocument()
  })

  it('underscore count matches word length', () => {
    render(<ClozeWord word="hello" isDeleted={true} showAll={false} isRevealed={false} />)
    expect(screen.getByText('_____')).toBeInTheDocument()
  })
})

function PassageSelector({ passages, selectedId, onSelect, onClose }) {
  return (
    <div data-testid="passage-selector">
      <h2>Select Passage</h2>
      <button data-testid="close-btn" onClick={onClose}>×</button>
      {passages.map(passage => (
        <button
          key={passage.id}
          data-testid={`passage-${passage.id}`}
          onClick={() => onSelect(passage.id)}
          className={selectedId === passage.id ? 'selected' : ''}
        >
          <span className="type">{passage.type}</span>
          <span className="title">{passage.title}</span>
        </button>
      ))}
    </div>
  )
}

describe('PassageSelector Component', () => {
  const mockPassages = [
    { id: 1, type: 'scripture', title: 'Test Scripture', subtitle: 'Test Sub' },
    { id: 2, type: 'poetry', title: 'Test Poetry', subtitle: 'Test Sub 2', introduction: 'Intro' }
  ]

  it('renders all passages', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<PassageSelector passages={mockPassages} selectedId={1} onSelect={onSelect} onClose={onClose} />)
    
    expect(screen.getByTestId('passage-1')).toBeInTheDocument()
    expect(screen.getByTestId('passage-2')).toBeInTheDocument()
  })

  it('shows passage types', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<PassageSelector passages={mockPassages} selectedId={1} onSelect={onSelect} onClose={onClose} />)
    
    expect(screen.getByText('scripture')).toBeInTheDocument()
    expect(screen.getByText('poetry')).toBeInTheDocument()
  })

  it('calls onSelect when passage clicked', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<PassageSelector passages={mockPassages} selectedId={1} onSelect={onSelect} onClose={onClose} />)
    
    fireEvent.click(screen.getByTestId('passage-2'))
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('calls onClose when close button clicked', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<PassageSelector passages={mockPassages} selectedId={1} onSelect={onSelect} onClose={onClose} />)
    
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(onClose).toHaveBeenCalled()
  })

  it('highlights selected passage', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<PassageSelector passages={mockPassages} selectedId={2} onSelect={onSelect} onClose={onClose} />)
    
    expect(screen.getByTestId('passage-2')).toHaveClass('selected')
    expect(screen.getByTestId('passage-1')).not.toHaveClass('selected')
  })
})

function OptionalToggle({ checked, onChange, hasOptional }) {
  if (!hasOptional) return null
  
  return (
    <label data-testid="optional-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid="optional-checkbox"
      />
      <span>Include Optional Sections</span>
    </label>
  )
}

describe('OptionalToggle Component', () => {
  it('renders nothing when hasOptional is false', () => {
    const onChange = vi.fn()
    const { container } = render(<OptionalToggle checked={true} onChange={onChange} hasOptional={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders when hasOptional is true', () => {
    const onChange = vi.fn()
    render(<OptionalToggle checked={true} onChange={onChange} hasOptional={true} />)
    expect(screen.getByTestId('optional-toggle')).toBeInTheDocument()
  })

  it('checkbox reflects checked state', () => {
    const onChange = vi.fn()
    render(<OptionalToggle checked={true} onChange={onChange} hasOptional={true} />)
    expect(screen.getByTestId('optional-checkbox')).toBeChecked()
  })

  it('checkbox reflects unchecked state', () => {
    const onChange = vi.fn()
    render(<OptionalToggle checked={false} onChange={onChange} hasOptional={true} />)
    expect(screen.getByTestId('optional-checkbox')).not.toBeChecked()
  })

  it('calls onChange when toggled', () => {
    const onChange = vi.fn()
    render(<OptionalToggle checked={true} onChange={onChange} hasOptional={true} />)
    
    fireEvent.click(screen.getByTestId('optional-checkbox'))
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
