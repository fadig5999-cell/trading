'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Images,
  BarChart3,
  Settings,
  LogOut,
  X,
  Gem
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { href: '/inventory', label: 'מלאי', icon: Package },
  { href: '/sales', label: 'מכירות', icon: ShoppingCart },
  { href: '/gallery', label: 'גלריה', icon: Images },
  { href: '/reports', label: 'דוחות', icon: BarChart3 },
  { href: '/settings', label: 'הגדרות', icon: Settings },
]

type SidebarProps = {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-72 z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          boxShadow: '4px 0 30px rgba(0,0,0,0.3)',
        }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}>
                <Gem size={20} color="#1a1a2e" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">ניהול מלאי</h1>
                <p className="text-xs" style={{ color: '#c9a84c' }}>שיש ואבן</p>
              </div>
            </div>
            {/* Mobile close */}
            <button
              onClick={onClose}
              className="md:hidden text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                style={isActive ? {} : { color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}>
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.email || 'מנהל'}</p>
              <p className="text-xs" style={{ color: '#c9a84c' }}>מנהל מערכת</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 p-3 rounded-xl text-sm transition-all"
            style={{ color: 'rgba(255,100,100,0.8)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,100,100,0.8)'
            }}
          >
            <LogOut size={16} />
            <span>התנתק</span>
          </button>
        </div>
      </aside>
    </>
  )
}
