import { useState } from 'react'

/**
 * Login/Register form component
 */
export function LoginForm({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      if (mode === 'login') {
        await onLogin(username, password)
      } else {
        if (!username.trim() || !password.trim()) {
          setError('Username and password required')
          return
        }
        await onRegister(username, password)
      }
      setUsername('')
      setPassword('')
    } catch (err) {
      setError(err.message || 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">hypermemo</h1>
        <div className="flex gap-2 mb-4" role="tablist">
          <button
            type="button"
            role="tab"
            tabIndex={0}
            aria-selected={mode === 'login'}
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${mode === 'login' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            tabIndex={0}
            aria-selected={mode === 'register'}
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${mode === 'register' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Register
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            tabIndex={0}
            autoFocus
            className="w-full px-4 py-2 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            tabIndex={0}
            className="w-full px-4 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-sm mb-3" role="alert">{error}</p>}
          <button
            type="submit"
            tabIndex={0}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginForm
