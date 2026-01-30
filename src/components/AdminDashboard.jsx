import { useState, useEffect } from 'react'
import { fetchAdminStats, computeStats } from '../utils/analytics'
import { PASSAGES } from '../passages'
import { PROGRAMS } from '../programs'

export default function AdminDashboard({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [rawData, setRawData] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchAdminStats()
        setRawData(data)
        setStats(computeStats(data))
      } catch (err) {
        console.error('Failed to load admin stats:', err)
        setError('Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  const getPassageName = (id) => {
    const passage = PASSAGES.find(p => p.id === parseInt(id))
    return passage ? passage.title : `Passage ${id}`
  }

  const getProgramName = (id) => {
    const program = PROGRAMS.find(p => p.id === id)
    return program ? program.name : id
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">{error}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex border-b">
          {['overview', 'users', 'passages', 'activity'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Users" value={stats.totalUsers} />
                <StatCard title="Active Users" value={stats.activeUsers} subtitle="with progress" />
                <StatCard title="Avg Progress" value={`${stats.avgProgress}%`} />
                <StatCard title="Registrations (30d)" value={stats.registrations30d} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Sessions Today" value={stats.sessionsToday} />
                <StatCard title="Guest Sessions" value={stats.guestSessionsToday} subtitle="today" />
                <StatCard title="User Sessions" value={stats.userSessionsToday} subtitle="today" />
                <StatCard title="Sessions (7d)" value={stats.sessions7d} />
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Sessions Over Time</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-end gap-1 h-32">
                    {stats.sessionsPerDay.slice(-14).map(({ day, count }) => {
                      const maxCount = Math.max(...stats.sessionsPerDay.map(d => d.count), 1)
                      const height = Math.max((count / maxCount) * 100, 4)
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-blue-500 rounded-t"
                            style={{ height: `${height}%` }}
                            title={`${day}: ${count} sessions`}
                          />
                          <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                            {day.slice(5)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && rawData && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Recent Registrations</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3">Username</th>
                      <th className="text-left p-3">Registered</th>
                      <th className="text-left p-3">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.users.slice(0, 50).map(user => {
                      const userProgress = rawData.progressData.filter(p => p.user_id === user.id)
                      const maxProgress = userProgress.length > 0
                        ? Math.max(...userProgress.map(p => p.deletion_percentage))
                        : 0
                      return (
                        <tr key={user.id} className="border-t border-gray-200">
                          <td className="p-3 font-medium">{user.username}</td>
                          <td className="p-3 text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{ width: `${maxProgress}%` }}
                                />
                              </div>
                              <span className="text-gray-600 text-xs">{maxProgress}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Registrations by Day</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-end gap-1 h-24">
                    {Object.entries(stats.registrationsByDay)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .slice(-30)
                      .map(([day, count]) => {
                        const maxCount = Math.max(...Object.values(stats.registrationsByDay), 1)
                        const height = Math.max((count / maxCount) * 100, 8)
                        return (
                          <div key={day} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-green-500 rounded-t min-h-[4px]"
                              style={{ height: `${height}%` }}
                              title={`${day}: ${count} registrations`}
                            />
                          </div>
                        )
                      })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">Last 30 days</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'passages' && stats && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Passage Views (30 days)</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {Object.entries(stats.passageViewCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([passageId, count]) => {
                      const maxCount = Math.max(...Object.values(stats.passageViewCounts), 1)
                      const width = (count / maxCount) * 100
                      return (
                        <div key={passageId} className="flex items-center gap-3">
                          <span className="w-48 text-sm text-gray-700 truncate">
                            {getPassageName(passageId)}
                          </span>
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="w-12 text-sm text-gray-600 text-right">{count}</span>
                        </div>
                      )
                    })}
                  {Object.keys(stats.passageViewCounts).length === 0 && (
                    <p className="text-gray-500 text-sm">No passage view data yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Program Views (30 days)</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {Object.entries(stats.programViewCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([programId, count]) => {
                      const maxCount = Math.max(...Object.values(stats.programViewCounts), 1)
                      const width = (count / maxCount) * 100
                      return (
                        <div key={programId} className="flex items-center gap-3">
                          <span className="w-48 text-sm text-gray-700 truncate">
                            {getProgramName(programId)}
                          </span>
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="w-12 text-sm text-gray-600 text-right">{count}</span>
                        </div>
                      )
                    })}
                  {Object.keys(stats.programViewCounts).length === 0 && (
                    <p className="text-gray-500 text-sm">No program view data yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">User Progress by Passage</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {(() => {
                    const passageProgress = {}
                    rawData.progressData.forEach(p => {
                      if (!passageProgress[p.text_id]) {
                        passageProgress[p.text_id] = { users: 0, totalProgress: 0 }
                      }
                      passageProgress[p.text_id].users++
                      passageProgress[p.text_id].totalProgress += p.deletion_percentage
                    })
                    return Object.entries(passageProgress)
                      .sort(([, a], [, b]) => b.users - a.users)
                      .map(([passageId, data]) => (
                        <div key={passageId} className="flex items-center gap-3 text-sm">
                          <span className="w-48 text-gray-700 truncate">
                            {getPassageName(passageId)}
                          </span>
                          <span className="text-gray-600">{data.users} users</span>
                          <span className="text-gray-500">
                            avg {Math.round(data.totalProgress / data.users)}%
                          </span>
                        </div>
                      ))
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && rawData && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Recent Activity</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left p-3">Time</th>
                      <th className="text-left p-3">Event</th>
                      <th className="text-left p-3">User</th>
                      <th className="text-left p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.recentEvents.slice(0, 100).map(event => {
                      const user = rawData.users.find(u => u.id === event.user_id)
                      return (
                        <tr key={event.id} className="border-t border-gray-200">
                          <td className="p-3 text-gray-600 whitespace-nowrap">
                            {new Date(event.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              event.event_type === 'registration' ? 'bg-green-100 text-green-700' :
                              event.event_type === 'login' ? 'bg-blue-100 text-blue-700' :
                              event.event_type === 'passage_view' ? 'bg-purple-100 text-purple-700' :
                              event.event_type === 'program_view' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {event.event_type}
                            </span>
                          </td>
                          <td className="p-3 text-gray-700">
                            {user ? user.username : <span className="text-gray-400">guest</span>}
                          </td>
                          <td className="p-3 text-gray-500 text-xs">
                            {event.passage_id && `Passage: ${getPassageName(event.passage_id)}`}
                            {event.program_id && `Program: ${event.program_id}`}
                            {event.metadata && Object.keys(event.metadata).length > 0 && 
                              JSON.stringify(event.metadata)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rawData.recentEvents.length === 0 && (
                  <p className="text-gray-500 text-sm p-4">No activity data yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  )
}
