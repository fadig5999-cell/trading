'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useMarbleInventory } from '@/hooks/useMarble'
import { MarbleType } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import SellModal from '@/components/SellModal'
import { Search, ShoppingCart, Info, Gem, X } from 'lucide-react'

function MarbleDetailModal({ marble, onClose, onSell }: {
  marble: MarbleType
  onClose: () => void
  onSell: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
        {/* Image */}
        <div className="relative h-64 overflow-hidden rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #f0ece4, #e8e0d0)' }}>
          {marble.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={marble.image_url} alt={marble.name} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Gem size={60} color="#c9a84c" className="opacity-40" />
            </div>
          )}
          <button onClick={onClose} className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white">
            <X size={16} />
          </button>
          <div className="absolute bottom-4 right-4">
            <StatusBadge status={marble.status} />
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#1a1a2e' }}>{marble.name_hebrew || marble.name}</h2>
          <p className="text-gray-400 mb-5">{marble.name} • {marble.category}</p>

          <div className="grid grid-cols-2 gap-4 mb-5">
            {[
              { label: 'צבע', value: marble.color },
              { label: 'עובי', value: marble.thickness },
              { label: 'מידות', value: marble.size },
              { label: 'מיקום', value: marble.location },
              { label: 'כמות במלאי', value: `${marble.quantity} לוחות` },
              { label: 'מחיר מכירה', value: marble.selling_price ? `₪${marble.selling_price.toLocaleString()}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: '#f8f9fa' }}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="font-semibold" style={{ color: '#1a1a2e' }}>{value || '—'}</p>
              </div>
            ))}
          </div>

          {marble.notes && (
            <div className="p-3 rounded-xl mb-5" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p className="text-xs text-gray-500 mb-1">הערות</p>
              <p className="text-sm text-gray-700">{marble.notes}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold text-gray-600 hover:bg-gray-50">סגור</button>
            <button
              onClick={onSell}
              disabled={marble.quantity === 0}
              className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)', color: '#1a1a2e' }}
            >
              <ShoppingCart size={18} />
              מכור לוח
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GalleryPage() {
  const { marbles, loading, sellSlab } = useMarbleInventory()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [detailMarble, setDetailMarble] = useState<MarbleType | null>(null)
  const [sellMarble, setSellMarble] = useState<MarbleType | null>(null)

  const categories = useMemo(() => [...new Set(marbles.map(m => m.category).filter(Boolean))], [marbles])

  const filtered = useMemo(() => {
    return marbles.filter(m => {
      const q = search.toLowerCase()
      if (q && !m.name.toLowerCase().includes(q) && !(m.name_hebrew || '').includes(q)) return false
      if (filterCategory && m.category !== filterCategory) return false
      return true
    })
  }, [marbles, search, filterCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#c9a84c' }} />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-5">
      {/* Filters */}
      <div className="premium-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pr-9 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory('')}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={!filterCategory ? { background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', color: '#c9a84c' } : { background: '#f1f5f9', color: '#64748b' }}
          >
            הכל
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c === filterCategory ? '' : c)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={filterCategory === c ? { background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', color: '#c9a84c' } : { background: '#f1f5f9', color: '#64748b' }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} סוגי שיש</p>

      {/* Gallery grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filtered.map((marble) => (
          <div key={marble.id} className="marble-gallery-card group">
            {/* Image */}
            <div className="relative h-48 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f0ece4, #e8e0d0)' }}>
              {marble.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={marble.image_url}
                  alt={marble.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Gem size={36} color="#c9a84c" className="opacity-50" />
                  <span className="text-xs text-gray-400">{marble.category}</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setDetailMarble(marble)}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg"
                >
                  <Info size={16} color="#1a1a2e" />
                </button>
                <button
                  onClick={() => setSellMarble(marble)}
                  disabled={marble.quantity === 0}
                  className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}
                >
                  <ShoppingCart size={16} color="#1a1a2e" />
                </button>
              </div>

              {/* Status badge */}
              <div className="absolute top-2 right-2">
                <StatusBadge status={marble.status} />
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-bold" style={{ color: '#1a1a2e' }}>{marble.name_hebrew || marble.name}</h3>
              <p className="text-xs text-gray-400 mb-3">{marble.color} • {marble.thickness}</p>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs text-gray-500">כמות: </span>
                  <span className={`font-bold ${marble.quantity === 0 ? 'text-red-500' : marble.quantity <= 3 ? 'text-amber-500' : 'text-green-600'}`}>
                    {marble.quantity}
                  </span>
                </div>
                {marble.selling_price && (
                  <span className="font-bold text-sm" style={{ color: '#c9a84c' }}>
                    ₪{marble.selling_price.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDetailMarble(marble)}
                  className="py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
                  style={{ background: '#f1f5f9', color: '#475569' }}
                >
                  <Info size={12} /> פרטים
                </button>
                <button
                  onClick={() => setSellMarble(marble)}
                  disabled={marble.quantity === 0}
                  className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)', color: '#1a1a2e' }}
                >
                  <ShoppingCart size={12} /> מכור לוח
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Gem size={40} className="mx-auto mb-3 opacity-30" />
            <p>לא נמצאו פריטים</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {detailMarble && (
        <MarbleDetailModal
          marble={detailMarble}
          onClose={() => setDetailMarble(null)}
          onSell={() => {
            setSellMarble(detailMarble)
            setDetailMarble(null)
          }}
        />
      )}

      {sellMarble && (
        <SellModal
          marble={sellMarble}
          onConfirm={async (info) => {
            await sellSlab(sellMarble, info)
            setSellMarble(null)
          }}
          onClose={() => setSellMarble(null)}
        />
      )}
    </div>
  )
}
