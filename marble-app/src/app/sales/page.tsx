'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useSales } from '@/hooks/useMarble'
import { format, isToday, isThisMonth, isThisWeek } from 'date-fns'
import { ShoppingCart, Search, Calendar, TrendingUp, Gem, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function SalesPage() {
  const { sales, loading, fetchSales } = useSales()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const q = search.toLowerCase()
      if (q && !s.marble_name.toLowerCase().includes(q) && !(s.marble_name_hebrew || '').includes(q) && !(s.customer_name || '').toLowerCase().includes(q)) return false
      if (dateFilter === 'today' && !isToday(new Date(s.sold_at))) return false
      if (dateFilter === 'week' && !isThisWeek(new Date(s.sold_at))) return false
      if (dateFilter === 'month' && !isThisMonth(new Date(s.sold_at))) return false
      return true
    })
  }, [sales, search, dateFilter])

  const stats = useMemo(() => ({
    today: sales.filter(s => isToday(new Date(s.sold_at))).reduce((sum, s) => sum + s.quantity_sold, 0),
    month: sales.filter(s => isThisMonth(new Date(s.sold_at))).reduce((sum, s) => sum + s.quantity_sold, 0),
    revenue: sales.filter(s => isThisMonth(new Date(s.sold_at))).reduce((sum, s) => sum + (s.total_amount || 0), 0),
    total: sales.reduce((sum, s) => sum + s.quantity_sold, 0),
  }), [sales])

  const handleDeleteSale = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק רשומה זו?')) return
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (error) {
      toast.error('שגיאה במחיקה')
    } else {
      toast.success('רשומה נמחקה')
      fetchSales()
    }
  }

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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'נמכר היום', value: stats.today, icon: ShoppingCart, color: '#c9a84c', bg: 'rgba(201,168,76,0.1)' },
          { label: 'נמכר החודש', value: stats.month, icon: Calendar, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'הכנסות החודש', value: `₪${stats.revenue.toLocaleString()}`, icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'סה״כ מכירות', value: stats.total, icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        ].map((s) => (
          <div key={s.label} className="premium-card p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: s.bg }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="premium-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם שיש או לקוח..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pr-9 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'today', 'week', 'month'] as const).map((f) => {
            const labels = { all: 'הכל', today: 'היום', week: 'השבוע', month: 'החודש' }
            return (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={dateFilter === f
                  ? { background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', color: '#c9a84c' }
                  : { background: '#f1f5f9', color: '#64748b' }}
              >
                {labels[f]}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} רשומות מכירה</p>

      {/* Sales table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="marble-table">
            <thead>
              <tr>
                <th>תאריך ושעה</th>
                <th>סוג שיש</th>
                <th>כמות</th>
                <th>מחיר יחידה</th>
                <th>סה״כ</th>
                <th>לקוח</th>
                <th>טלפון</th>
                <th>הערות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#1a1a2e' }}>{format(new Date(sale.sold_at), 'dd/MM/yyyy')}</p>
                      <p className="text-xs text-gray-400">{format(new Date(sale.sold_at), 'HH:mm')}</p>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #f0ece4, #e8e0d0)' }}>
                        <Gem size={12} color="#c9a84c" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{sale.marble_name_hebrew || sale.marble_name}</p>
                        <p className="text-xs text-gray-400">{sale.marble_name}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="font-bold" style={{ color: '#1a1a2e' }}>{sale.quantity_sold}</span></td>
                  <td>
                    {sale.selling_price
                      ? <span style={{ color: '#c9a84c' }}>₪{sale.selling_price.toLocaleString()}</span>
                      : '—'}
                  </td>
                  <td>
                    {sale.total_amount
                      ? <span className="font-bold" style={{ color: '#10b981' }}>₪{sale.total_amount.toLocaleString()}</span>
                      : '—'}
                  </td>
                  <td><span className="text-sm">{sale.customer_name || '—'}</span></td>
                  <td>
                    {sale.customer_phone
                      ? <a href={`tel:${sale.customer_phone}`} className="text-blue-500 hover:underline text-sm">{sale.customer_phone}</a>
                      : '—'}
                  </td>
                  <td><span className="text-sm text-gray-500">{sale.notes || '—'}</span></td>
                  <td>
                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium"
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    <p>אין רשומות מכירה</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
