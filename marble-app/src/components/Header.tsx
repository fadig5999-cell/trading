'use client'

import { Menu, Bell, Search } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type HeaderProps = {
  title: string
  onMenuClick: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/inventory?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
        style={{ color: '#1a1a2e' }}
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <h2 className="text-xl font-bold" style={{ color: '#1a1a2e' }}>{title}</h2>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto hidden sm:flex">
        <div className="relative w-full">
          <Search
            size={16}
            className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400"
          />
          <input
            type="text"
            placeholder="חיפוש שיש..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pr-9 py-2 text-sm"
          />
        </div>
      </form>

      {/* Right actions */}
      <div className="mr-auto flex items-center gap-2">
        <button
          className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
          style={{ color: '#1a1a2e' }}
        >
          <Bell size={20} />
          <span
            className="absolute top-1 left-1 w-2 h-2 rounded-full"
            style={{ background: '#c9a84c' }}
          />
        </button>
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}
        >
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          פעיל
        </div>
      </div>
    </header>
  )
}
