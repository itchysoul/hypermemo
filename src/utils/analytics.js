import { supabase } from '../supabaseClient'

const SESSION_KEY = 'cloze_session_id'

export function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

export async function trackEvent(eventType, options = {}) {
  const { userId, passageId, programId, metadata = {} } = options
  const sessionId = getSessionId()
  
  try {
    await supabase.from('usage_events').insert({
      user_id: userId || null,
      session_id: sessionId,
      event_type: eventType,
      passage_id: passageId || null,
      program_id: programId || null,
      metadata
    })
  } catch (err) {
    console.error('Failed to track event:', err)
  }
}

export async function trackPageView(userId, passageId, programId) {
  if (passageId) {
    await trackEvent('passage_view', { userId, passageId })
  }
  if (programId) {
    await trackEvent('program_view', { userId, programId })
  }
}

export async function trackSessionStart(userId) {
  await trackEvent('session_start', { userId })
}

export async function trackRegistration(userId) {
  await trackEvent('registration', { userId })
}

export async function trackLogin(userId) {
  await trackEvent('login', { userId })
}

export async function trackProgressUpdate(userId, passageId, deletionPercentage) {
  await trackEvent('progress_update', { 
    userId, 
    passageId, 
    metadata: { deletion_percentage: deletionPercentage } 
  })
}

export async function fetchAdminStats() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  const [
    { data: recentEvents },
    { data: dailyStats },
    { data: users },
    { data: progressData }
  ] = await Promise.all([
    supabase
      .from('usage_events')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('usage_daily_stats')
      .select('*')
      .gte('stat_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('stat_date', { ascending: false }),
    supabase
      .from('users')
      .select('id, username, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('progress')
      .select('user_id, text_id, deletion_percentage, updated_at')
  ])

  return {
    recentEvents: recentEvents || [],
    dailyStats: dailyStats || [],
    users: users || [],
    progressData: progressData || []
  }
}

export function computeStats(data) {
  const { recentEvents, users, progressData } = data
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const registrationsToday = users.filter(u => new Date(u.created_at) >= today).length
  const registrations7d = users.filter(u => new Date(u.created_at) >= sevenDaysAgo).length
  const registrations30d = users.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length

  const sessionsToday = new Set(recentEvents.filter(e => new Date(e.created_at) >= today).map(e => e.session_id)).size
  const sessions7d = new Set(recentEvents.filter(e => new Date(e.created_at) >= sevenDaysAgo).map(e => e.session_id)).size

  const guestSessionsToday = new Set(recentEvents.filter(e => new Date(e.created_at) >= today && !e.user_id).map(e => e.session_id)).size
  const userSessionsToday = new Set(recentEvents.filter(e => new Date(e.created_at) >= today && e.user_id).map(e => e.session_id)).size

  const passageViewCounts = {}
  recentEvents
    .filter(e => e.event_type === 'passage_view' && e.passage_id)
    .forEach(e => {
      passageViewCounts[e.passage_id] = (passageViewCounts[e.passage_id] || 0) + 1
    })

  const programViewCounts = {}
  recentEvents
    .filter(e => e.event_type === 'program_view' && e.program_id)
    .forEach(e => {
      programViewCounts[e.program_id] = (programViewCounts[e.program_id] || 0) + 1
    })

  const registrationsByDay = {}
  users.forEach(u => {
    const day = new Date(u.created_at).toISOString().split('T')[0]
    registrationsByDay[day] = (registrationsByDay[day] || 0) + 1
  })

  const sessionsByDay = {}
  recentEvents.forEach(e => {
    const day = new Date(e.created_at).toISOString().split('T')[0]
    if (!sessionsByDay[day]) sessionsByDay[day] = new Set()
    sessionsByDay[day].add(e.session_id)
  })
  const sessionsPerDay = Object.entries(sessionsByDay)
    .map(([day, sessions]) => ({ day, count: sessions.size }))
    .sort((a, b) => a.day.localeCompare(b.day))

  const activeUsers = new Set(progressData.map(p => p.user_id)).size
  const avgProgress = progressData.length > 0
    ? Math.round(progressData.reduce((sum, p) => sum + p.deletion_percentage, 0) / progressData.length)
    : 0

  return {
    totalUsers: users.length,
    registrationsToday,
    registrations7d,
    registrations30d,
    sessionsToday,
    sessions7d,
    guestSessionsToday,
    userSessionsToday,
    passageViewCounts,
    programViewCounts,
    registrationsByDay,
    sessionsPerDay,
    activeUsers,
    avgProgress
  }
}
