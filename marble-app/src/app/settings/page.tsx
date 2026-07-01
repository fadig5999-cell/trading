'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { User, Lock, Database, Info, Gem } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loadingPw, setLoadingPw] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('הסיסמאות אינן תואמות')
      return
    }
    if (password.length < 6) {
      toast.error('הסיסמה חייבת להיות לפחות 6 תווים')
      return
    }
    setLoadingPw(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('שגיאה בעדכון הסיסמה')
    } else {
      toast.success('הסיסמה עודכנה בהצלחה')
      setPassword('')
      setConfirmPassword('')
    }
    setLoadingPw(false)
  }

  return (
    <div className="page-enter space-y-6 max-w-2xl">
      {/* Account info */}
      <div className="premium-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.1)' }}>
            <User size={18} color="#3b82f6" />
          </div>
          <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>פרטי חשבון</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f8f9fa' }}>
            <span className="text-sm text-gray-500">אימייל</span>
            <span className="font-medium text-sm">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f8f9fa' }}>
            <span className="text-sm text-gray-500">תפקיד</span>
            <span className="font-medium text-sm" style={{ color: '#c9a84c' }}>מנהל מערכת</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f8f9fa' }}>
            <span className="text-sm text-gray-500">ID משתמש</span>
            <span className="font-mono text-xs text-gray-400">{user?.id?.substring(0, 16)}...</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="premium-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.1)' }}>
            <Lock size={18} color="#8b5cf6" />
          </div>
          <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>שינוי סיסמה</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">סיסמה חדשה</label>
            <input
              type="password"
              className="form-input"
              placeholder="לפחות 6 תווים"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">אימות סיסמה</label>
            <input
              type="password"
              className="form-input"
              placeholder="הזן שוב את הסיסמה"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loadingPw || !password}
            className="btn-primary disabled:opacity-50"
          >
            {loadingPw ? 'מעדכן...' : 'עדכן סיסמה'}
          </button>
        </form>
      </div>

      {/* Database info */}
      <div className="premium-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201,168,76,0.1)' }}>
            <Database size={18} color="#c9a84c" />
          </div>
          <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>הגדרות מסד נתונים</h3>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ background: '#f8f9fa' }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>ספק מסד נתונים</p>
            <p className="text-sm text-gray-500">Supabase (PostgreSQL)</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="flex items-start gap-2">
              <Info size={16} color="#c9a84c" className="mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1" style={{ color: '#1a1a2e' }}>הגדרת Supabase</p>
                <p className="mb-2">להפעלת המערכת עם נתונים אמיתיים:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>צור חשבון בחינם ב-supabase.com</li>
                  <li>צור פרויקט חדש</li>
                  <li>הפעל את קובץ <code className="bg-gray-100 px-1 rounded">supabase-schema.sql</code> ב-SQL Editor</li>
                  <li>צור bucket בשם &quot;marble-images&quot; (Public)</li>
                  <li>הוסף משתמש ב-Authentication</li>
                  <li>עדכן את <code className="bg-gray-100 px-1 rounded">.env.local</code> עם ה-URL וה-Key</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* App info */}
      <div className="premium-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}>
            <Gem size={18} color="#1a1a2e" />
          </div>
          <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>אודות המערכת</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong style={{ color: '#1a1a2e' }}>שם:</strong> ניהול מלאי שיש ואבן</p>
          <p><strong style={{ color: '#1a1a2e' }}>גרסה:</strong> 1.0.0</p>
          <p><strong style={{ color: '#1a1a2e' }}>טכנולוגיות:</strong> Next.js 15, Supabase, TypeScript</p>
          <p><strong style={{ color: '#1a1a2e' }}>עיצוב:</strong> ממשק עברי RTL, עיצוב יוקרתי</p>
        </div>
      </div>
    </div>
  )
}
