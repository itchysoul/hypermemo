# Memorization App Enhancement Ideas

Based on cognitive science and mnemonic principles, here are ideas to improve passage memorization effectiveness.

---

## Core Mnemonic Principles Applied

### 1. Testing Effect (Active Recall)
The act of retrieving information strengthens memory more than passive re-reading. Our cloze deletion approach already leverages this—users must recall hidden words rather than just reading them.

### 2. Spaced Repetition
Reviewing material at optimal intervals maximizes long-term retention. The forgetting curve shows we forget ~70% within 24 hours without review, but strategic reviews at increasing intervals can achieve 90%+ retention.

### 3. Desirable Difficulty
Learning that feels harder often produces better retention. Slightly challenging conditions (like partial hints instead of full reveals) force deeper processing.

### 4. Generation Effect
Information we generate ourselves is remembered better than information we passively receive.

### 5. Chunking
Breaking large passages into meaningful units reduces cognitive load and leverages working memory limits (7±2 items).

### 6. Elaborative Encoding
Connecting new information to existing knowledge creates more retrieval pathways.

---

## Feature Ideas

### ⭐ HIGH IMPACT

#### 1. First-Letter Hints Mode
Instead of showing underscores, show just the first letter of each hidden word. Research shows first-letter cues are highly effective retrieval triggers while still requiring active recall.

**Difficulty progression:**
- Level 1: Full word visible
- Level 2: First letter + underscores (e.g., "l___" for "love")
- Level 3: Just underscores
- Level 4: No hint at all (blank space same width as word)

```jsx
// In ClozeWord component
function ClozeWord({ word, isDeleted, showAll, isRevealed, hintLevel = 'underscores' }) {
  const getHint = () => {
    switch (hintLevel) {
      case 'firstLetter':
        return word[0] + '_'.repeat(word.length - 1)
      case 'underscores':
        return '_'.repeat(word.length)
      case 'none':
        return '' // Just show a blank space
      default:
        return '_'.repeat(word.length)
    }
  }
  
  // ... rest of component
  {!revealed && (
    <span className="absolute inset-0 flex items-center justify-center text-gray-400">
      {getHint()}
    </span>
  )}
}
```

#### 2. Chunked Practice Mode
Break passage into logical chunks (verses, sentences, paragraphs). Master each chunk before combining them. This respects working memory limits and builds confidence.

**Implementation approach:**
- Parse text by verse numbers, paragraph breaks, or sentence boundaries
- Add chunk selector UI
- Track mastery per chunk
- "Combine chunks" feature to practice multiple chunks together

```jsx
// Chunk parsing utility
function parseIntoChunks(text) {
  // Split by verse numbers (e.g., "1 ", "2 ", etc. at start of line)
  const versePattern = /(?=^\d+\s)/gm
  const chunks = text.split(versePattern).filter(c => c.trim())
  
  return chunks.map((content, index) => ({
    id: index,
    content: content.trim(),
    mastered: false
  }))
}

// State for chunk mode
const [activeChunks, setActiveChunks] = useState([0]) // Start with first chunk
const [chunkMastery, setChunkMastery] = useState({}) // { chunkId: percentMastered }
```

#### 3. Spaced Repetition Scheduler
Track when each passage/chunk was last reviewed and calculate optimal review times using SM-2 or similar algorithm.

```js
// Backend: Add review scheduling table
db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    chunk_id INTEGER,
    ease_factor REAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    next_review DATE,
    last_review DATE,
    FOREIGN KEY (text_id) REFERENCES texts(id)
  );
`);

// SM-2 algorithm implementation
function calculateNextReview(quality, easeFactor, interval, repetitions) {
  // quality: 0-5 (0-2 = forgot, 3 = hard, 4 = good, 5 = easy)
  if (quality < 3) {
    return { interval: 1, repetitions: 0, easeFactor }
  }
  
  const newEF = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  
  let newInterval
  if (repetitions === 0) newInterval = 1
  else if (repetitions === 1) newInterval = 6
  else newInterval = Math.round(interval * newEF)
  
  return {
    interval: newInterval,
    repetitions: repetitions + 1,
    easeFactor: newEF
  }
}
```

#### 4. Type-to-Recall Mode
Instead of hovering to reveal, user types the missing word. This leverages the generation effect—actively producing the answer strengthens memory more than recognition.

```jsx
function TypeClozeWord({ word, isDeleted, onCorrect, onIncorrect }) {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('pending') // 'pending' | 'correct' | 'incorrect'
  
  const checkAnswer = () => {
    const normalized = input.toLowerCase().trim()
    const expected = word.toLowerCase()
    
    if (normalized === expected) {
      setStatus('correct')
      onCorrect?.()
    } else {
      setStatus('incorrect')
      onIncorrect?.()
    }
  }
  
  if (!isDeleted) return <span>{word}</span>
  
  if (status === 'correct') {
    return <span className="bg-green-200 text-green-900 px-1 rounded">{word}</span>
  }
  
  return (
    <span className="inline-flex items-center">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={checkAnswer}
        onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
        className={`border-b-2 bg-transparent outline-none text-center
          ${status === 'incorrect' ? 'border-red-500 text-red-600' : 'border-gray-400'}
        `}
        style={{ width: `${word.length * 0.6}em` }}
        placeholder={'_'.repeat(Math.min(word.length, 5))}
      />
    </span>
  )
}
```

#### 5. Error Tracking & Targeted Practice
Track which specific words the user struggles with. Prioritize hiding those words and offer focused practice sessions.

```js
// Backend: Word-level difficulty tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS word_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    word_index INTEGER NOT NULL,
    word TEXT NOT NULL,
    times_shown INTEGER DEFAULT 0,
    times_recalled INTEGER DEFAULT 0,
    times_forgotten INTEGER DEFAULT 0,
    last_forgotten DATE,
    UNIQUE(text_id, word_index),
    FOREIGN KEY (text_id) REFERENCES texts(id)
  );
`);

// Frontend: Calculate word difficulty
function getWordDifficulty(stats) {
  if (!stats || stats.times_shown < 3) return 0.5 // Unknown
  return stats.times_forgotten / stats.times_shown
}

// Prioritize difficult words for deletion
function selectWordsToDeleteWeighted(tokens, percentage, wordStats) {
  const wordTokens = tokens.filter(t => t.type === 'word')
  const count = Math.round(wordTokens.length * (percentage / 100))
  
  // Weight selection toward words with higher difficulty
  const weighted = wordTokens.map(t => ({
    ...t,
    weight: getWordDifficulty(wordStats[t.wordIndex]) + 0.1 // Ensure all have some chance
  }))
  
  // Weighted random selection
  const selected = []
  const pool = [...weighted]
  
  while (selected.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0)
    let random = Math.random() * totalWeight
    
    for (let i = 0; i < pool.length; i++) {
      random -= pool[i].weight
      if (random <= 0) {
        selected.push(pool[i].wordIndex)
        pool.splice(i, 1)
        break
      }
    }
  }
  
  return selected.sort((a, b) => a - b)
}
```

---

### 🔷 MEDIUM IMPACT

#### 6. Audio Playback
Let users hear the passage read aloud. Dual-coding (visual + auditory) strengthens memory traces.

```jsx
// Using Web Speech API for text-to-speech
function AudioControls({ text }) {
  const [isPlaying, setIsPlaying] = useState(false)
  
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9 // Slightly slower for memorization
    utterance.onend = () => setIsPlaying(false)
    speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }
  
  const stop = () => {
    speechSynthesis.cancel()
    setIsPlaying(false)
  }
  
  return (
    <button onClick={isPlaying ? stop : speak}>
      {isPlaying ? '⏹ Stop' : '🔊 Listen'}
    </button>
  )
}
```

#### 7. Sentence Completion Mode
Hide entire sentences instead of individual words. Good for later stages when individual words are mastered.

```jsx
// Parse into sentences and hide entire sentences
function parseSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim())
}

// Toggle between word-level and sentence-level cloze
const [clozeLevel, setClozeLevel] = useState('word') // 'word' | 'sentence' | 'paragraph'
```

#### 8. Confidence Marking
Let users mark words they find difficult (right-click or long-press). These get priority in future deletions.

```jsx
// Add to ClozeWord
const [markedDifficult, setMarkedDifficult] = useState(false)

const handleContextMenu = (e) => {
  e.preventDefault()
  setMarkedDifficult(!markedDifficult)
  onMarkDifficult?.(wordIndex, !markedDifficult)
}

// Visual indicator for marked words
className={`... ${markedDifficult ? 'ring-2 ring-orange-400' : ''}`}
```

#### 9. Progress Visualization
Show a visual map of the passage with mastery levels indicated by color intensity.

```jsx
function PassageHeatmap({ tokens, wordStats }) {
  return (
    <div className="flex flex-wrap gap-1 p-4 bg-gray-100 rounded">
      {tokens.filter(t => t.type === 'word').map((token, idx) => {
        const difficulty = getWordDifficulty(wordStats[token.wordIndex])
        const hue = 120 - (difficulty * 120) // Green (mastered) to Red (struggling)
        
        return (
          <div
            key={idx}
            className="w-4 h-4 rounded-sm cursor-pointer"
            style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
            title={`${token.value}: ${Math.round((1 - difficulty) * 100)}% mastery`}
          />
        )
      })}
    </div>
  )
}
```

#### 10. Reverse Mode
Show only the deleted words, hide everything else. Forces different cognitive pathways and context reconstruction.

```jsx
// Simply invert the isDeleted logic
const [reverseMode, setReverseMode] = useState(false)

// When rendering:
const shouldHide = reverseMode ? !isDeleted : isDeleted
```

---

### 🔹 LOWER IMPACT (but interesting)

#### 11. Method of Loci Integration
Allow users to associate chunks with locations in a familiar place. Show visual prompts for each location.

#### 12. Rhythm/Music Mode  
Add background rhythm or allow setting text to a melody. Musical memory is very strong.

#### 13. Collaborative Practice
Real-time practice with others—take turns reciting chunks, compete on accuracy.

#### 14. Handwriting Mode
Let users write out passages by hand (tablet/stylus). Motor memory reinforces verbal memory.

#### 15. Sleep Reminder
Prompt users to review right before sleep—sleep consolidates memory.

---

## Implementation Priority Recommendation

### Phase 1 (Quick Wins)
1. **First-Letter Hints** - Simple UI change, big impact
2. **Audio Playback** - Web Speech API is built-in
3. **Confidence Marking** - Simple right-click handler

### Phase 2 (Core Features)  
4. **Chunked Practice** - Requires text parsing and UI changes
5. **Error Tracking** - Needs database schema updates
6. **Type-to-Recall** - Alternative input mode

### Phase 3 (Advanced)
7. **Spaced Repetition Scheduler** - Complex but high value
8. **Progress Visualization** - Motivating feedback
9. **Reverse Mode** - Novel practice variation

---

## Metrics to Track

- **Recall accuracy**: % of words correctly recalled per session
- **Time to mastery**: Sessions needed to reach X% at Y% deletion
- **Retention**: Accuracy after N days without practice  
- **Struggle words**: Words with >50% error rate
- **Session duration**: Optimal session length for retention
