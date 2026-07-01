'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, Gem, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)
    if (error) {
      setError('אימייל או סיסמה שגויים. נסה שוב.')
      setLoading(false)
    } else {
      router.replace('/dashboard')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
      }}
    >
      {/* Decorative circles */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #c9a84c, transparent)' }} />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #c9a84c, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #4a9eff, transparent)' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Top gold bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8d5a3, #c9a84c)' }} />

          <div className="p-10">
            {/* Logo */}
            <div className="text-center mb-10">
              <div
                className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)',
                  boxShadow: '0 8px 30px rgba(201,168,76,0.4)',
                }}
              >
                <Gem size={36} color="#1a1a2e" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">ניהול מלאי שיש</h1>
              <p className="text-sm" style={{ color: 'rgba(201,168,76,0.8)' }}>
                מערכת ניהול מקצועית לתצוגת שיש ואבן
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  כתובת אימייל
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute top-1/2 -translate-y-1/2 right-3"
                    style={{ color: 'rgba(201,168,76,0.6)' }}
                  />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 rounded-xl text-white placeholder-gray-500 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      direction: 'ltr',
                      textAlign: 'left',
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '1px solid rgba(201,168,76,0.5)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid rgba(255,255,255,0.12)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  סיסמה
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute top-1/2 -translate-y-1/2 right-3"
                    style={{ color: 'rgba(201,168,76,0.6)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-10 pl-10 py-3 rounded-xl text-white placeholder-gray-500 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '1px solid rgba(201,168,76,0.5)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid rgba(255,255,255,0.12)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 left-3"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl text-sm text-center"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-lg transition-all mt-2"
                style={{
                  background: loading
                    ? 'rgba(201,168,76,0.4)'
                    : 'linear-gradient(135deg, #c9a84c 0%, #e8d5a3 50%, #c9a84c 100%)',
                  color: '#1a1a2e',
                  boxShadow: loading ? 'none' : '0 8px 25px rgba(201,168,76,0.4)',
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                    מתחבר...
                  </div>
                ) : 'כניסה למערכת'}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
              © 2025 ניהול מלאי שיש. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
