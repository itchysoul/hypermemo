import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import './index.css'
import { supabase } from './supabaseClient'
import { PASSAGES } from './passages'
import {
  parseTextIntoTokens,
  removeOptionalSections,
  stripOptionalMarkers,
  parseVerses,
  getWordIndicesForVerse
} from './utils/parsing'
import {
  selectWordsToDelete,
  addMoreDeletions,
  removeDeletions,
  calculateMinPercentage,
  PERCENTAGE_STEP,
  VERSE_MODE_THRESHOLD
} from './utils/wordSelection'
import {
  getNextInterval,
  formatTimeUntil,
  getDueReviews,
  INTERVALS,
  COMPLETIONS_FOR_REVIEW
} from './utils/spacedRepetition'
import { ClozeWord } from './components/ClozeWord'
import { PassageSelector } from './components/PassageSelector'

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cloze_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loginMode, setLoginMode] = useState('login')
  const [loginError, setLoginError] = useState('')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  const [selectedPassageId, setSelectedPassageId] = useState(1)
  const [showPassageSelector, setShowPassageSelector] = useState(false)
  const [includeOptional, setIncludeOptional] = useState(true)
  
  const [text, setText] = useState(null)
  const [deletionPercentage, setDeletionPercentage] = useState(PERCENTAGE_STEP)
  const [deletedIndices, setDeletedIndices] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [textId, setTextId] = useState(1)
  
  const [verticalRevealMode, setVerticalRevealMode] = useState(true)
  const [cursorY, setCursorY] = useState(-1)
  const [cursorX, setCursorX] = useState(-1)
  
  const [verseMode, setVerseMode] = useState(false)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [verseProgress, setVerseProgress] = useState({})
  const [reviewingVerse, setReviewingVerse] = useState(null)
  const [awaitingQualityFeedback, setAwaitingQualityFeedback] = useState(null)
  const [dueReviews, setDueReviews] = useState([])
  const [now, setNow] = useState(Date.now())
  
  const wordRefsMap = useRef(new Map())
  const textContainerRef = useRef(null)

  const selectedPassage = useMemo(() => {
    return PASSAGES.find(p => p.id === selectedPassageId) || PASSAGES[0]
  }, [selectedPassageId])

  const processedContent = useMemo(() => {
    if (!selectedPassage) return ''
    let content = selectedPassage.content
    if (!includeOptional) {
      content = removeOptionalSections(content)
    } else {
      content = stripOptionalMarkers(content)
    }
    return content
  }, [selectedPassage, includeOptional])

  const tokens = useMemo(() => {
    if (!processedContent) return []
    return parseTextIntoTokens(processedContent)
  }, [processedContent])

  const totalWords = useMemo(() => {
    return tokens.filter(t => t.type === 'word').length
  }, [tokens])

  const minPercentage = useMemo(() => {
    return calculateMinPercentage(totalWords)
  }, [totalWords])

  const allVerses = useMemo(() => {
    if (!processedContent) return []
    return parseVerses(processedContent, selectedPassage?.type || 'scripture')
  }, [processedContent, selectedPassage])

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
        setText(selectedPassage)

        const { data: progressData } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('text_id', selectedPassageId)
          .single()
        
        if (progressData) {
          setDeletionPercentage(progressData.deletion_percentage)
          setDeletedIndices(progressData.deleted_indices || [])
          if (progressData.verse_progress) {
            setVerseProgress(progressData.verse_progress)
          }
          if (progressData.deletion_percentage >= VERSE_MODE_THRESHOLD) {
            setVerseMode(true)
          }
        } else {
          setDeletionPercentage(PERCENTAGE_STEP)
          setDeletedIndices([])
          setVerseProgress({})
          setVerseMode(false)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedPassageId, selectedPassage, user])

  useEffect(() => {
    if (!user || loading) return
    if (deletedIndices.length === 0) return
    
    const saveTimeout = setTimeout(async () => {
      try {
        await supabase
          .from('progress')
          .upsert({
            user_id: user.id,
            text_id: selectedPassageId,
            deletion_percentage: deletionPercentage,
            deleted_indices: deletedIndices,
            verse_progress: verseProgress
          }, { onConflict: 'user_id,text_id' })
      } catch (err) {
        console.error('Failed to auto-save progress:', err)
      }
    }, 500)
    
    return () => clearTimeout(saveTimeout)
  }, [user, loading, selectedPassageId, deletionPercentage, deletedIndices, verseProgress])

  useEffect(() => {
    if (tokens.length > 0 && deletedIndices.length === 0) {
      const indices = selectWordsToDelete(tokens, deletionPercentage, totalWords)
      setDeletedIndices(indices)
    }
  }, [tokens, totalWords])

  const handleHarder = () => {
    const newPercentage = Math.min(100, deletionPercentage + PERCENTAGE_STEP)
    const targetCount = Math.max(2, Math.round(totalWords * (newPercentage / 100)))
    const newIndices = addMoreDeletions(tokens, deletedIndices, targetCount, totalWords)
    setDeletionPercentage(newPercentage)
    setDeletedIndices(newIndices)
    setShowAll(false)
    
    if (newPercentage >= VERSE_MODE_THRESHOLD && !verseMode) {
      setVerseMode(true)
      setCurrentVerseIndex(0)
    }
  }

  const handleEasier = useCallback(() => {
    const newPercentage = Math.max(minPercentage, deletionPercentage - PERCENTAGE_STEP)
    const targetCount = Math.max(2, Math.round(totalWords * (newPercentage / 100)))
    const newIndices = removeDeletions(deletedIndices, targetCount)
    setDeletionPercentage(newPercentage)
    setDeletedIndices(newIndices)
    setShowAll(false)
  }, [minPercentage, deletionPercentage, totalWords, deletedIndices])

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
      {showPassageSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Select Passage</h2>
              <button
                onClick={() => setShowPassageSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              {PASSAGES.map(passage => (
                <button
                  key={passage.id}
                  onClick={() => {
                    setSelectedPassageId(passage.id)
                    setShowPassageSelector(false)
                    setLoading(true)
                    setDeletedIndices([])
                    setCurrentVerseIndex(0)
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedPassageId === passage.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      passage.type === 'poetry' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {passage.type}
                    </span>
                    {selectedPassageId === passage.id && (
                      <span className="text-blue-500 text-sm">✓ Selected</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800">{passage.title}</h3>
                  <p className="text-sm text-gray-600">{passage.subtitle}</p>
                  {passage.introduction && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{passage.introduction}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{selectedPassage?.title}</h1>
            <p className="text-sm text-gray-600">{selectedPassage?.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPassageSelector(true)}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              Select Passage
            </button>
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
          
          {selectedPassage?.content?.includes('[OPTIONAL]') && (
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOptional}
                  onChange={(e) => {
                    setIncludeOptional(e.target.checked)
                    setDeletedIndices([])
                  }}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Include Optional Sections</span>
              </label>
              <span className="text-xs text-gray-500">
                {includeOptional ? 'Showing full passage' : 'Optional sections hidden'}
              </span>
            </div>
          )}
          
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
              <span className="text-sm font-medium text-gray-700">
                {selectedPassage?.type === 'poetry' ? 'Couplet at a Time' : 'Verse at a Time'}
              </span>
            </label>
            {!verseMode && (
              <span className="text-xs text-gray-500">
                Will switch to {selectedPassage?.type === 'poetry' ? 'couplet' : 'verse'} at a time mode at 50% hidden.
              </span>
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
                  {selectedPassage?.type === 'poetry' ? 'Couplet' : 'Verse'} {currentVerse?.number}
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
                    {reviewingVerse !== null 
                      ? `Complete Review ${currentVerse?.number} →` 
                      : `Complete ${selectedPassage?.type === 'poetry' ? 'Couplet' : 'Verse'} ${currentVerse?.number} →`}
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
                    Review {selectedPassage?.type === 'poetry' ? 'Couplet' : 'Verse'} {verseNum}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {verseMode && Object.keys(verseProgress).length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {selectedPassage?.type === 'poetry' ? 'Couplet' : 'Verse'} Progress:
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {verses.map(v => {
                  const p = verseProgress[v.number]
                  const label = selectedPassage?.type === 'poetry' ? 'C' : 'V'
                  if (!p) return (
                    <span key={v.number} className="px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      {label}{v.number}: not started
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
                      {label}{v.number}: {p.completions}x
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
