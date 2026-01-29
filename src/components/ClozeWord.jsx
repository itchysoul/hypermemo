import { useState } from 'react'

/**
 * A word in the cloze deletion display
 * Shows hidden words as blanks, reveals on hover or when revealed
 * Supports bold and italic markdown styling
 */
export function ClozeWord({ word, isDeleted, showAll, isRevealed, wordRef, bold, italic }) {
  const [isHovered, setIsHovered] = useState(false)
  
  const getStateClasses = () => {
    if (isDeleted && !showAll && !isRevealed && !isHovered) return 'bg-gray-300'
    if (isDeleted && (showAll || isRevealed || isHovered)) return 'bg-green-200'
    return ''
  }
  
  const getStyleClasses = () => {
    let classes = ''
    if (bold) classes += 'font-bold '
    if (italic) classes += 'italic '
    return classes.trim()
  }
  
  if (!isDeleted) {
    return <span ref={wordRef} className={getStyleClasses()}>{word}</span>
  }
  
  const revealed = showAll || isRevealed || isHovered
  
  return (
    <span
      ref={wordRef}
      className={`inline-block px-1 rounded cursor-pointer transition-colors duration-200 relative ${getStateClasses()} ${getStyleClasses()}`}
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

export default ClozeWord
