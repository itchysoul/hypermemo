import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import './index.css'
import { supabase } from './supabaseClient'

const TEXT_DATA = {
  id: 1,
  title: 'THEOLOGICAL VIRTUES - LOVE',
  content: `1 Corinthians 13 

1 Though I speak with the tongues of men and of angels, but have not love, I have become sounding brass or a clanging cymbal. 
2 And though I have the gift of prophecy, and understand all mysteries and all knowledge, and though I have all faith, so that I could remove mountains, but have not love, I am nothing. 
3 And though I bestow all my goods to feed the poor, and though I give my body to be burned, but have not love, it profits me nothing.

4 Love suffers long and is kind; love does not envy; love does not parade itself, is not puffed up; 
5 does not behave rudely, does not seek its own, is not provoked, thinks no evil; 
6 does not rejoice in iniquity, but rejoices in the truth; 
7 bears all things, believes all things, hopes all things, endures all things.

8 Love never fails. But whether there are prophecies, they will fail; whether there are tongues, they will cease; whether there is knowledge, it will vanish away. 
9 For we know in part and we prophesy in part. 
10 But when that which is perfect has come, then that which is in part will be done away.
—----------------------א

11 When I was a child, I spoke as a child, I understood as a child, I thought as a child; but when I became a man, I put away childish things. 
12 For now we see in a mirror, dimly, but then face to face. Now I know in part, but then I shall know just as I also am known.

13 And now abide faith, hope, love, these three; but the greatest of these is love.`
}

function parseTextIntoTokens(text) {
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

function parseVerses(text) {
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

function getWordIndicesForVerse(tokens, verseContent, startSearchIndex = 0) {
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

function selectWordsToDelete(tokens, percentage, totalWords) {
  const wordTokens = tokens.filter(t => t.type === 'word')
  const count = Math.max(2, Math.round(totalWords * (percentage / 100)))
  const actualCount = Math.min(count, wordTokens.length)
  
  const indices = []
  const available = wordTokens.map(t => t.wordIndex)
  
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }
  
  for (let i = 0; i < actualCount && available.length > 0; i++) {
    const seed = i + percentage * 1000
    const randomIndex = Math.floor(seededRandom(seed) * available.length)
    indices.push(available[randomIndex])
    available.splice(randomIndex, 1)
  }
  
  return indices.sort((a, b) => a - b)
}

function addMoreDeletions(tokens, currentIndices, targetCount, totalWords) {
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

function removeDeletions(currentIndices, targetCount) {
  if (targetCount >= currentIndices.length) return [...currentIndices]
  const toRemove = currentIndices.length - targetCount
  const shuffled = [...currentIndices].sort(() => Math.random() - 0.5)
  return shuffled.slice(toRemove).sort((a, b) => a - b)
}

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

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cloze_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loginMode, setLoginMode] = useState('login')
  const [loginError, setLoginError] = useState('')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  const [text, setText] = useState(null)
  const [deletionPercentage, setDeletionPercentage] = useState(5)
  const [deletedIndices, setDeletedIndices] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [textId, setTextId] = useState(1)
  
  const [verticalRevealMode, setVerticalRevealMode] = useState(true)
  const [cursorY, setCursorY] = useState(-1)
  
  const [verseMode, setVerseMode] = useState(false)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [verseProgress, setVerseProgress] = useState({})
  const [reviewingVerse, setReviewingVerse] = useState(null)
  const [awaitingQualityFeedback, setAwaitingQualityFeedback] = useState(null)
  const [dueReviews, setDueReviews] = useState([])
  const [now, setNow] = useState(Date.now())
  
  const wordRefsMap = useRef(new Map())
  const textContainerRef = useRef(null)

  const tokens = useMemo(() => {
    if (!text) return []
    return parseTextIntoTokens(text.content)
  }, [text])

  const totalWords = useMemo(() => {
    return tokens.filter(t => t.type === 'word').length
  }, [tokens])

  const minPercentage = useMemo(() => {
    if (totalWords === 0) return 5
    const minWords = Math.max(2, Math.min(10, Math.ceil(totalWords * 0.05)))
    return Math.max(5, Math.ceil((minWords / totalWords) * 100))
  }, [totalWords])

  const allVerses = useMemo(() => {
    if (!text) return []
    return parseVerses(text.content)
  }, [text])

  const verses = useMemo(() => {
    return allVerses.filter(v => !v.isTitle)
  }, [allVerses])

  const verseWordIndices = useMemo(() => {
    if (allVerses.length === 0 || tokens.length === 0) return {}
    
    const result = {}
    let searchStart = 0
    
    for (const verse of allVerses) {
      if (verse.isTitle) continue
      const indices = getWordIndicesForVerse(tokens, verse.content, searchStart)
      result[verse.number] = indices
      if (indices.length > 0) {
        const lastWordIndex = indices[indices.length - 1]
        searchStart = tokens.findIndex(t => t.wordIndex === lastWordIndex) + 1
      }
    }
    
    return result
  }, [allVerses, tokens])

  const currentVerse = useMemo(() => {
    if (verses.length === 0 || currentVerseIndex >= verses.length) return null
    return verses[currentVerseIndex]
  }, [verses, currentVerseIndex])

  useEffect(() => {
    if (!verseMode) return
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [verseMode])

  useEffect(() => {
    if (!verseMode) return
    const due = Object.entries(verseProgress)
      .filter(([_, p]) => p.nextReview && p.nextReview <= now && p.completions >= 2)
      .map(([verseNum, p]) => ({ verseNum: parseInt(verseNum), dueTime: p.nextReview }))
      .sort((a, b) => a.dueTime - b.dueTime)
      .map(item => item.verseNum)
    setDueReviews(due)
  }, [verseMode, verseProgress, now])

  const getNextInterval = (quality, currentInterval) => {
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

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false)
        return
      }
      try {
        setText(TEXT_DATA)

        const { data: progressData } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('text_id', textId)
          .single()
        
        if (progressData) {
          setDeletionPercentage(progressData.deletion_percentage)
          setDeletedIndices(progressData.deleted_indices || [])
          if (progressData.verse_progress) {
            setVerseProgress(progressData.verse_progress)
          }
          if (progressData.deletion_percentage >= 50) {
            setVerseMode(true)
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [textId, user])

  useEffect(() => {
    if (!user || loading) return
    if (deletedIndices.length === 0) return
    
    const saveTimeout = setTimeout(async () => {
      try {
        await supabase
          .from('progress')
          .upsert({
            user_id: user.id,
            text_id: textId,
            deletion_percentage: deletionPercentage,
            deleted_indices: deletedIndices,
            verse_progress: verseProgress
          }, { onConflict: 'user_id,text_id' })
      } catch (err) {
        console.error('Failed to auto-save progress:', err)
      }
    }, 500)
    
    return () => clearTimeout(saveTimeout)
  }, [user, loading, textId, deletionPercentage, deletedIndices, verseProgress])

  useEffect(() => {
    if (tokens.length > 0 && deletedIndices.length === 0) {
      const indices = selectWordsToDelete(tokens, deletionPercentage, totalWords)
      setDeletedIndices(indices)
    }
  }, [tokens, totalWords])

  const handleHarder = () => {
    const newPercentage = Math.min(100, deletionPercentage + 5)
    const targetCount = Math.max(2, Math.round(totalWords * (newPercentage / 100)))
    const newIndices = addMoreDeletions(tokens, deletedIndices, targetCount, totalWords)
    setDeletionPercentage(newPercentage)
    setDeletedIndices(newIndices)
    setShowAll(false)
    
    if (newPercentage >= 50 && !verseMode) {
      setVerseMode(true)
      setCurrentVerseIndex(0)
    }
  }

  const handleEasier = useCallback(() => {
    const newPercentage = Math.max(minPercentage, deletionPercentage - 5)
    const targetCount = Math.max(2, Math.round(totalWords * (newPercentage / 100)))
    const newIndices = removeDeletions(deletedIndices, targetCount)
    setDeletionPercentage(newPercentage)
    setDeletedIndices(newIndices)
    setShowAll(false)
  }, [minPercentage, deletionPercentage, totalWords, deletedIndices])

  const [cursorX, setCursorX] = useState(-1)
  
  const handleMouseMove = useCallback((e) => {
    if (verticalRevealMode) {
      setCursorY(e.clientY)
      setCursorX(e.clientX)
    }
  }, [verticalRevealMode])
  
  const handleMouseLeave = useCallback(() => {
    if (verticalRevealMode) {
      setCursorY(-1)
      setCursorX(-1)
    }
  }, [verticalRevealMode])
  
  const isWordRevealed = useCallback((wordIndex) => {
    if (!verticalRevealMode || cursorY < 0) return false
    const wordEl = wordRefsMap.current.get(wordIndex)
    if (!wordEl) return false
    const rect = wordEl.getBoundingClientRect()
    
    const wordTop = rect.top
    const wordBottom = rect.bottom
    const wordRight = rect.right
    
    const isAboveCursorLine = wordBottom <= cursorY
    const isOnCursorLine = wordTop <= cursorY && wordBottom > cursorY
    
    if (isAboveCursorLine) return true
    if (isOnCursorLine && wordRight <= cursorX) return true
    
    return false
  }, [verticalRevealMode, cursorY, cursorX])

  const isWordInCurrentVerse = useCallback((wordIndex) => {
    if (!verseMode || !currentVerse) return false
    const indices = verseWordIndices[currentVerse.number]
    return indices && indices.includes(wordIndex)
  }, [verseMode, currentVerse, verseWordIndices])

  const handleCompleteVerse = () => {
    if (!currentVerse) return
    
    const verseNum = currentVerse.number
    const isReview = reviewingVerse !== null
    
    if (isReview) {
      setAwaitingQualityFeedback(verseNum)
      return
    }
    
    const current = verseProgress[verseNum] || { completions: 0, interval: 0 }
    const newCompletions = current.completions + 1
    
    let nextReview = null
    let newInterval = current.interval
    
    if (newCompletions >= 2) {
      newInterval = newCompletions === 2 ? 120000 : getNextInterval('easy', current.interval)
      nextReview = Date.now() + newInterval
    }
    
    setVerseProgress(prev => ({
      ...prev,
      [verseNum]: {
        completions: newCompletions,
        interval: newInterval,
        nextReview,
        lastCompleted: Date.now()
      }
    }))
    
    if (newCompletions === 1 && currentVerseIndex > 0) {
      const prevVerseNum = verses[currentVerseIndex - 1].number
      const prevProgress = verseProgress[prevVerseNum]
      if (prevProgress && prevProgress.completions === 1) {
        setCurrentVerseIndex(currentVerseIndex - 1)
        return
      }
    }
    
    const currentDue = Object.entries(verseProgress)
      .filter(([vn, p]) => parseInt(vn) !== verseNum && p.nextReview && p.nextReview <= Date.now() && p.completions >= 2)
      .map(([vn, p]) => ({ verseNum: parseInt(vn), dueTime: p.nextReview }))
      .sort((a, b) => a.dueTime - b.dueTime)
    
    if (currentDue.length > 0) {
      const nextReviewVerse = currentDue[0].verseNum
      setReviewingVerse(nextReviewVerse)
      const idx = verses.findIndex(v => v.number === nextReviewVerse)
      if (idx !== -1) setCurrentVerseIndex(idx)
      return
    }
    
    if (currentVerseIndex < verses.length - 1) {
      setCurrentVerseIndex(currentVerseIndex + 1)
    }
  }

  const handleStartReview = (verseNum) => {
    setReviewingVerse(verseNum)
    const idx = verses.findIndex(v => v.number === verseNum)
    if (idx !== -1) setCurrentVerseIndex(idx)
  }

  const handleReviewQuality = (quality) => {
    if (awaitingQualityFeedback === null) return
    
    const verseNum = awaitingQualityFeedback
    const current = verseProgress[verseNum] || { completions: 2, interval: 120000 }
    const newInterval = getNextInterval(quality, current.interval)
    
    setVerseProgress(prev => ({
      ...prev,
      [verseNum]: {
        ...current,
        completions: current.completions + 1,
        interval: newInterval,
        nextReview: Date.now() + newInterval,
        lastReviewed: Date.now()
      }
    }))
    
    setAwaitingQualityFeedback(null)
    setReviewingVerse(null)
    setDueReviews(prev => prev.filter(v => v !== verseNum))
    
    const currentDue = Object.entries(verseProgress)
      .filter(([vn, p]) => parseInt(vn) !== verseNum && p.nextReview && p.nextReview <= Date.now() && p.completions >= 2)
      .map(([vn, p]) => ({ verseNum: parseInt(vn), dueTime: p.nextReview }))
      .sort((a, b) => a.dueTime - b.dueTime)
    
    if (currentDue.length > 0) {
      const nextReviewVerse = currentDue[0].verseNum
      setReviewingVerse(nextReviewVerse)
      const idx = verses.findIndex(v => v.number === nextReviewVerse)
      if (idx !== -1) setCurrentVerseIndex(idx)
      return
    }
    
    if (currentVerseIndex < verses.length - 1) {
      setCurrentVerseIndex(currentVerseIndex + 1)
    }
  }

  const handlePreviousVerse = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1)
    }
  }

  const formatTimeUntil = (ms) => {
    if (ms <= 0) return 'now'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginUsername)
        .eq('password', loginPassword)
        .single()
      
      if (error || !data) {
        setLoginError('Invalid username or password')
        return
      }
      localStorage.setItem('cloze_user', JSON.stringify(data))
      setUser(data)
      setLoginUsername('')
      setLoginPassword('')
    } catch (err) {
      setLoginError('Failed to connect to server')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Username and password required')
      return
    }
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', loginUsername)
        .single()
      
      if (existing) {
        setLoginError('Username already taken')
        return
      }
      
      const { data, error } = await supabase
        .from('users')
        .insert({ username: loginUsername, password: loginPassword })
        .select()
        .single()
      
      if (error) {
        setLoginError('Failed to register')
        return
      }
      localStorage.setItem('cloze_user', JSON.stringify(data))
      setUser(data)
      setLoginUsername('')
      setLoginPassword('')
    } catch (err) {
      setLoginError('Failed to connect to server')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('cloze_user')
    setUser(null)
    setText(null)
    setDeletedIndices([])
    setVerseProgress({})
    setLoading(true)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Cloze Practice</h1>
          <div className="flex gap-2 mb-4" role="tablist">
            <button
              type="button"
              role="tab"
              tabIndex={0}
              aria-selected={loginMode === 'login'}
              onClick={() => setLoginMode('login')}
              className={`flex-1 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${loginMode === 'login' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              tabIndex={0}
              aria-selected={loginMode === 'register'}
              onClick={() => setLoginMode('register')}
              className={`flex-1 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${loginMode === 'register' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Register
            </button>
          </div>
          <form onSubmit={loginMode === 'login' ? handleLogin : handleRegister}>
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              tabIndex={0}
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              tabIndex={0}
              className="w-full px-4 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {loginError && <p className="text-red-500 text-sm mb-3" role="alert">{loginError}</p>}
            <button
              type="submit"
              tabIndex={0}
              className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {loginMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  const deletedCount = deletedIndices.length

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-800">{text?.title}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Hi, {user.username}</span>
            <div className="relative group">
              <button
                className="w-6 h-6 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center"
              >
                ?
              </button>
              <div className="absolute right-0 top-8 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <p className="font-bold mb-2">Welcome to hypermemo!</p>
                <p className="mb-2">This should teach you some methods for memorizing starting with gaining familiarity (up to 50% cloze deletions). Pay attention to meaning and think through some association and hand actions during this phase.</p>
                <p className="mb-2">After we reach 50% deletion, it will switch to verse-at-a-time method which will schedule and evaluate your reviews.</p>
                <p className="mb-2">Maximum intensity memorization is hard and it should feel hard. The number one rule is that if easy, you're doing it wrong.</p>
                <p className="mb-2">At a certain point, you will do better to switch to paper.</p>
                <p className="italic text-gray-400">-- Very much in beta!</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center mb-4">
            {!verseMode && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{deletedCount}</span> of <span className="font-medium">{totalWords}</span> words hidden ({deletionPercentage}%)
              </div>
            )}
            
            <div className="flex gap-2 ml-auto">
              {!verseMode && (
                <>
                  <button
                    onClick={handleEasier}
                    disabled={deletionPercentage <= minPercentage}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Easier
                  </button>
                  <button
                    onClick={handleHarder}
                    disabled={deletionPercentage >= 100}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Harder
                  </button>
                </>
              )}
              <button
                onClick={() => setShowAll(!showAll)}
                                className={`px-4 py-2 rounded transition-colors ${
                  showAll 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                {showAll ? 'Hide All' : 'Show All'}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verticalRevealMode}
                onChange={(e) => {
                  setVerticalRevealMode(e.target.checked)
                  if (!e.target.checked) setCursorY(-1)
                }}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Vertical Cursor Reveal</span>
            </label>
            {verticalRevealMode && (
              <span className="text-xs text-gray-500">Move cursor down to reveal words above cursor line</span>
            )}
          </div>
          
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verseMode}
                onChange={(e) => {
                  setVerseMode(e.target.checked)
                  if (e.target.checked) setCurrentVerseIndex(0)
                }}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Verse at a Time</span>
            </label>
            {!verseMode && (
              <span className="text-xs text-gray-500">Will switch to verse at a time mode at 50% hidden.</span>
            )}
            {verseMode && verses.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousVerse}
                  disabled={currentVerseIndex === 0}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600">
                  Verse {currentVerse?.number}
                  {verseProgress[currentVerse?.number]?.completions > 0 && (
                    <span className="ml-1 text-xs text-green-600">
                      (✓{verseProgress[currentVerse?.number]?.completions})
                    </span>
                  )}
                </span>
                {awaitingQualityFeedback !== null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-orange-600 font-medium">How was it?</span>
                    <button
                      onClick={() => handleReviewQuality('again')}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Couldn't recite
                    </button>
                    <button
                      onClick={() => handleReviewQuality('hard')}
                      className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                    >
                      Hard
                    </button>
                    <button
                      onClick={() => handleReviewQuality('easy')}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Easy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCompleteVerse}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    {reviewingVerse !== null ? `Complete Review ${currentVerse?.number} →` : `Complete Verse ${currentVerse?.number} →`}
                  </button>
                )}
              </div>
            )}
          </div>
          
          {verseMode && dueReviews.length > 0 && reviewingVerse === null && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-sm font-medium text-orange-800 mb-2">Reviews Due:</div>
              <div className="flex flex-wrap gap-2">
                {dueReviews.map(verseNum => (
                  <button
                    key={verseNum}
                    onClick={() => handleStartReview(verseNum)}
                    className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                  >
                    Review Verse {verseNum}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {verseMode && Object.keys(verseProgress).length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Verse Progress:</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {verses.map(v => {
                  const p = verseProgress[v.number]
                  if (!p) return (
                    <span key={v.number} className="px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      V{v.number}: not started
                    </span>
                  )
                  const timeUntil = p.nextReview ? p.nextReview - now : null
                  return (
                    <span 
                      key={v.number} 
                      className={`px-2 py-1 rounded ${
                        timeUntil !== null && timeUntil <= 0 
                          ? 'bg-orange-200 text-orange-800' 
                          : 'bg-green-200 text-green-800'
                      }`}
                    >
                      V{v.number}: {p.completions}x
                      {timeUntil !== null && (
                        <span className="ml-1">
                          ({timeUntil <= 0 ? 'due!' : formatTimeUntil(timeUntil)})
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            ref={textContainerRef}
            className="text-lg leading-relaxed whitespace-pre-wrap"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {tokens.map((token, idx) => {
              if (token.type === 'word') {
                const isDeletedByPercentage = deletedIndices.includes(token.wordIndex)
                const isDeletedByVerse = verseMode && isWordInCurrentVerse(token.wordIndex)
                const isDeleted = verseMode ? isDeletedByVerse : isDeletedByPercentage
                return (
                  <ClozeWord
                    key={idx}
                    word={token.value}
                    isDeleted={isDeleted}
                    showAll={showAll}
                    isRevealed={isWordRevealed(token.wordIndex)}
                    wordRef={(el) => {
                      if (el) wordRefsMap.current.set(token.wordIndex, el)
                    }}
                  />
                )
              }
              return <span key={idx}>{token.value}</span>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
