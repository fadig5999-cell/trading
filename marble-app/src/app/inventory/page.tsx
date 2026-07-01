'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMarbleInventory } from '@/hooks/useMarble'
import { MarbleType } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import SellModal from '@/components/SellModal'
import MarbleFormModal from '@/components/MarbleFormModal'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  ShoppingCart,
  PlusCircle,
  MinusCircle,
  SlidersHorizontal,
  X,
  Gem,
} from 'lucide-react'

function StockAdjustModal({
  marble,
  mode,
  onConfirm,
  onClose,
}: {
  marble: MarbleType
  mode: 'add' | 'remove' | 'manual'
  onConfirm: (amount: number) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState(mode === 'manual' ? marble.quantity : 1)

  const titles = { add: 'הוסף מלאי', remove: 'הפחת מלאי', manual: 'עדכון ידני' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-8 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#1a1a2e' }}>{titles[mode]}</h3>
        <p className="text-gray-500 text-sm mb-5">{marble.name_hebrew || marble.name}</p>
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            {mode === 'manual' ? 'כמות חדשה' : 'כמות'}
          </label>
          <input
            type="number"
            min={mode === 'remove' ? 1 : 0}
            max={mode === 'remove' ? marble.quantity : undefined}
            className="form-input text-center text-2xl font-bold"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          {mode !== 'manual' && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              כמות נוכחית: {marble.quantity} → חדש: {
                mode === 'add'
                  ? marble.quantity + amount
                  : Math.max(0, marble.quantity - amount)
              }
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold text-gray-600 hover:bg-gray-50">ביטול</button>
          <button
            onClick={() => onConfirm(amount)}
            className="flex-1 py-3 rounded-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', color: '#c9a84c' }}
          >
            אשר
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ marble, onConfirm, onClose }: {
  marble: MarbleType
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-8 max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.1)' }}>
          <Trash2 size={28} color="#ef4444" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#1a1a2e' }}>מחיקת פריט</h3>
        <p className="text-gray-500 mb-6">האם אתה בטוח שברצונך למחוק את <strong>{marble.name_hebrew || marble.name}</strong>? פעולה זו אינה ניתנת לביטול.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold text-gray-600 hover:bg-gray-50">ביטול</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold text-white btn-danger">מחק</button>
        </div>
      </div>
    </div>
  )
}

function InventoryContent() {
  const searchParams = useSearchParams()
  const { marbles, loading, sellSlab, addStock, removeStock, updateQuantity, addMarble, updateMarble, deleteMarble } = useMarbleInventory()

  const [view, setView] = useState<'table' | 'cards'>('table')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [filterColor, setFilterColor] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('filter') || '')
  const [filterThickness, setFilterThickness] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [sellMarble, setSellMarble] = useState<MarbleType | null>(null)
  const [stockMarble, setStockMarble] = useState<{ marble: MarbleType; mode: 'add' | 'remove' | 'manual' } | null>(null)
  const [editMarble, setEditMarble] = useState<MarbleType | null>(null)
  const [marbleToDelete, setMarbleToDelete] = useState<MarbleType | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    const s = searchParams.get('search')
    const f = searchParams.get('filter')
    if (s) setSearch(s)
    if (f) setFilterStatus(f)
  }, [searchParams])

  const colors = useMemo(() => [...new Set(marbles.map((m) => m.color).filter(Boolean))], [marbles])
  const categories = useMemo(() => [...new Set(marbles.map((m) => m.category).filter(Boolean))], [marbles])
  const thicknesses = useMemo(() => [...new Set(marbles.map((m) => m.thickness).filter(Boolean))], [marbles])

  const filtered = useMemo(() => {
    return marbles.filter((m) => {
      const q = search.toLowerCase()
      if (q && !m.name.toLowerCase().includes(q) && !(m.name_hebrew || '').includes(q)) return false
      if (filterColor && m.color !== filterColor) return false
      if (filterCategory && m.category !== filterCategory) return false
      if (filterThickness && m.thickness !== filterThickness) return false
      if (filterStatus && m.status !== filterStatus) return false
      return true
    })
  }, [marbles, search, filterColor, filterCategory, filterThickness, filterStatus])

  const clearFilters = () => {
    setSearch(''); setFilterColor(''); setFilterCategory('')
    setFilterThickness(''); setFilterStatus('')
  }

  const hasFilters = search || filterColor || filterCategory || filterThickness || filterStatus

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
      {/* Toolbar */}
      <div className="premium-card p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
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

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${showFilters ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          style={showFilters ? { background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', color: '#c9a84c' } : {}}
        >
          <SlidersHorizontal size={16} />
          <span>סינון</span>
          {hasFilters && <span className="w-2 h-2 rounded-full bg-amber-400" />}
        </button>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X size={14} /> נקה
          </button>
        )}

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setView('table')}
            className={`p-2 transition-colors ${view === 'table' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={view === 'table' ? { background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)' } : {}}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView('cards')}
            className={`p-2 transition-colors ${view === 'cards' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={view === 'cards' ? { background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)' } : {}}
          >
            <LayoutGrid size={16} />
          </button>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="btn-gold text-sm px-4 py-2"
        >
          <Plus size={16} />
          הוסף סוג שיש
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="premium-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="form-input text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">כל הקטגוריות</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-input text-sm" value={filterColor} onChange={(e) => setFilterColor(e.target.value)}>
            <option value="">כל הצבעים</option>
            {colors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-input text-sm" value={filterThickness} onChange={(e) => setFilterThickness(e.target.value)}>
            <option value="">כל העוביים</option>
            {thicknesses.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-input text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">כל הסטטוסים</option>
            <option value="in_stock">במלאי</option>
            <option value="low_stock">מלאי נמוך</option>
            <option value="sold_out">אזל מהמלאי</option>
          </select>
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-gray-500">
        מציג <strong>{filtered.length}</strong> מתוך <strong>{marbles.length}</strong> סוגי שיש
      </p>

      {/* Table View */}
      {view === 'table' && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="marble-table">
              <thead>
                <tr>
                  <th>תמונה</th>
                  <th>שם</th>
                  <th>קטגוריה</th>
                  <th>צבע</th>
                  <th>עובי</th>
                  <th>מידות</th>
                  <th>כמות</th>
                  <th>מיקום</th>
                  <th>מחיר מכירה</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((marble) => (
                  <tr key={marble.id}>
                    <td>
                      {marble.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={marble.image_url} alt={marble.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #f0ece4, #e8e0d0)' }}>
                          <Gem size={18} color="#c9a84c" />
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold" style={{ color: '#1a1a2e' }}>{marble.name_hebrew || marble.name}</p>
                        <p className="text-xs text-gray-400">{marble.name}</p>
                      </div>
                    </td>
                    <td><span className="text-sm">{marble.category}</span></td>
                    <td><span className="text-sm">{marble.color}</span></td>
                    <td><span className="text-sm">{marble.thickness}</span></td>
                    <td><span className="text-sm">{marble.size}</span></td>
                    <td>
                      <span className={`text-2xl font-bold ${marble.quantity === 0 ? 'text-red-500' : marble.quantity <= 3 ? 'text-amber-500' : 'text-green-600'}`}>
                        {marble.quantity}
                      </span>
                    </td>
                    <td><span className="text-sm text-gray-500">{marble.location || '—'}</span></td>
                    <td>
                      {marble.selling_price
                        ? <span className="font-bold" style={{ color: '#c9a84c' }}>₪{marble.selling_price.toLocaleString()}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td><StatusBadge status={marble.status} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSellMarble(marble)}
                          disabled={marble.quantity === 0}
                          title="מכור לוח"
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                          style={{ color: '#c9a84c', background: 'rgba(201,168,76,0.1)' }}
                        >
                          <ShoppingCart size={14} />
                        </button>
                        <button
                          onClick={() => setStockMarble({ marble, mode: 'add' })}
                          title="הוסף מלאי"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}
                        >
                          <PlusCircle size={14} />
                        </button>
                        <button
                          onClick={() => setStockMarble({ marble, mode: 'remove' })}
                          disabled={marble.quantity === 0}
                          title="הפחת מלאי"
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                          style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)' }}
                        >
                          <MinusCircle size={14} />
                        </button>
                        <button
                          onClick={() => setEditMarble(marble)}
                          title="ערוך"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setMarbleToDelete(marble)}
                          title="מחק"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-gray-400">
                      <Gem size={32} className="mx-auto mb-2 opacity-30" />
                      <p>לא נמצאו פריטים</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards View */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((marble) => (
            <div key={marble.id} className="premium-card overflow-hidden">
              {/* Image */}
              <div className="relative h-40 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #f0ece4, #e8e0d0)' }}>
                {marble.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marble.image_url} alt={marble.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gem size={40} color="#c9a84c" className="opacity-50" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={marble.status} />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-base" style={{ color: '#1a1a2e' }}>
                  {marble.name_hebrew || marble.name}
                </h3>
                <p className="text-xs text-gray-400 mb-3">{marble.name} • {marble.category}</p>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-gray-500">כמות: </span>
                    <span className={`font-bold text-lg ${marble.quantity === 0 ? 'text-red-500' : marble.quantity <= 3 ? 'text-amber-500' : 'text-green-600'}`}>
                      {marble.quantity}
                    </span>
                  </div>
                  {marble.selling_price && (
                    <span className="font-bold text-sm" style={{ color: '#c9a84c' }}>
                      ₪{marble.selling_price.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSellMarble(marble)}
                    disabled={marble.quantity === 0}
                    className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)', color: '#1a1a2e' }}
                  >
                    <ShoppingCart size={13} /> מכור לוח
                  </button>
                  <button
                    onClick={() => setStockMarble({ marble, mode: 'add' })}
                    className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <PlusCircle size={13} /> הוסף מלאי
                  </button>
                  <button
                    onClick={() => setEditMarble(marble)}
                    className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.2)' }}
                  >
                    <Pencil size={13} /> ערוך
                  </button>
                  <button
                    onClick={() => setMarbleToDelete(marble)}
                    className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Trash2 size={13} /> מחק
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
      )}

      {/* Modals */}
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

      {stockMarble && (
        <StockAdjustModal
          marble={stockMarble.marble}
          mode={stockMarble.mode}
          onConfirm={async (amount) => {
            if (stockMarble.mode === 'add') await addStock(stockMarble.marble, amount)
            else if (stockMarble.mode === 'remove') await removeStock(stockMarble.marble, amount)
            else await updateQuantity(stockMarble.marble, amount)
            setStockMarble(null)
          }}
          onClose={() => setStockMarble(null)}
        />
      )}

      {(showAddForm || editMarble) && (
        <MarbleFormModal
          marble={editMarble || undefined}
          onSave={async (data) => {
            if (editMarble) {
              await updateMarble(editMarble.id, data)
              setEditMarble(null)
            } else {
              await addMarble(data)
              setShowAddForm(false)
            }
          }}
          onClose={() => { setShowAddForm(false); setEditMarble(null) }}
        />
      )}

      {marbleToDelete && (
        <DeleteConfirmModal
          marble={marbleToDelete}
          onConfirm={async () => {
            await deleteMarble(marbleToDelete.id)
            setMarbleToDelete(null)
          }}
          onClose={() => setMarbleToDelete(null)}
        />
      )}
    </div>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#c9a84c' }} /></div>}>
      <InventoryContent />
    </Suspense>
  )
}
