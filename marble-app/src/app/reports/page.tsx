'use client'

export const dynamic = 'force-dynamic'

import { useMemo } from 'react'
import { useMarbleInventory, useSales } from '@/hooks/useMarble'
import { isThisMonth, format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, Package, DollarSign, AlertTriangle, Award } from 'lucide-react'

const GOLD_COLORS = ['#c9a84c', '#1a1a2e', '#e8d5a3', '#4a5568', '#b8902a', '#2d3748', '#d4af6a', '#718096']

export default function ReportsPage() {
  const { marbles, loading: ml } = useMarbleInventory()
  const { sales, loading: sl } = useSales()

  const topSellers = useMemo(() => {
    const counts: Record<string, { name: string; count: number; revenue: number }> = {}
    sales.forEach(s => {
      const key = s.marble_name
      if (!counts[key]) counts[key] = { name: s.marble_name_hebrew || s.marble_name, count: 0, revenue: 0 }
      counts[key].count += s.quantity_sold
      counts[key].revenue += s.total_amount || 0
    })
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [sales])

  const monthlySales = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
    return days.map(day => {
      const daySales = sales.filter(s => {
        const d = new Date(s.sold_at)
        return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear()
      })
      return {
        date: format(day, 'dd'),
        מכירות: daySales.reduce((sum, s) => sum + s.quantity_sold, 0),
        הכנסות: daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
        isToday: isToday(day),
      }
    })
  }, [sales])

  const categoryValue = useMemo(() => {
    const cats: Record<string, number> = {}
    marbles.forEach(m => {
      if (!cats[m.category]) cats[m.category] = 0
      if (m.selling_price) cats[m.category] += m.selling_price * m.quantity
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).filter(x => x.value > 0)
  }, [marbles])

  const inventoryValue = useMemo(() =>
    marbles.reduce((sum, m) => sum + (m.selling_price || 0) * m.quantity, 0), [marbles])

  const monthlyRevenue = useMemo(() =>
    sales.filter(s => isThisMonth(new Date(s.sold_at))).reduce((sum, s) => sum + (s.total_amount || 0), 0), [sales])

  const lowStockList = marbles.filter(m => m.status === 'low_stock' || m.status === 'sold_out')

  if (ml || sl) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#c9a84c' }} />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'שווי מלאי כולל', value: `₪${inventoryValue.toLocaleString()}`, icon: DollarSign, color: '#c9a84c', bg: 'rgba(201,168,76,0.1)' },
          { label: 'הכנסות החודש', value: `₪${monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'לוחות במלאי', value: marbles.reduce((sum, m) => sum + m.quantity, 0), icon: Package, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'התראות מלאי', value: lowStockList.length, icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(s => (
          <div key={s.label} className="premium-card p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold" style={{ color: '#1a1a2e' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly sales chart */}
        <div className="premium-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: '#1a1a2e' }}>מכירות החודש (לפי יום)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlySales} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, color: '#c9a84c' }}
                  formatter={(val) => [val, 'לוחות']}
              />
              <Bar dataKey="מכירות" fill="#c9a84c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category value pie */}
        <div className="premium-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: '#1a1a2e' }}>שווי מלאי לפי קטגוריה</h3>
          {categoryValue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryValue}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryValue.map((_, i) => (
                    <Cell key={i} fill={GOLD_COLORS[i % GOLD_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, color: '#c9a84c' }}
                  formatter={(val) => [`₪${Number(val).toLocaleString()}`, 'שווי']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400">אין נתונים</div>
          )}
        </div>
      </div>

      {/* Top sellers */}
      <div className="premium-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}>
            <Award size={18} color="#1a1a2e" />
          </div>
          <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>מוצרים הנמכרים ביותר</h3>
        </div>
        {topSellers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">אין נתוני מכירות</div>
        ) : (
          <div className="space-y-3">
            {topSellers.map((item, i) => (
              <div key={item.name} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: '#fafafa' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: i === 0 ? 'linear-gradient(135deg, #c9a84c, #e8d5a3)' :
                      i === 1 ? 'linear-gradient(135deg, #9ca3af, #d1d5db)' :
                        i === 2 ? 'linear-gradient(135deg, #b45309, #d97706)' : '#f1f5f9',
                    color: i < 3 ? '#1a1a2e' : '#64748b',
                  }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#1a1a2e' }}>{item.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(item.count / topSellers[0].count) * 100}%`,
                        maxWidth: '200px',
                        background: 'linear-gradient(90deg, #c9a84c, #e8d5a3)',
                      }}
                    />
                  </div>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="font-bold" style={{ color: '#1a1a2e' }}>{item.count} לוחות</p>
                  {item.revenue > 0 && (
                    <p className="text-xs" style={{ color: '#c9a84c' }}>₪{item.revenue.toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low stock list */}
      {lowStockList.length > 0 && (
        <div className="premium-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>רשימת מלאי נמוך / אזל</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="marble-table">
              <thead>
                <tr>
                  <th>שם</th>
                  <th>קטגוריה</th>
                  <th>כמות</th>
                  <th>מיקום</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {lowStockList.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.name_hebrew || m.name}</strong></td>
                    <td>{m.category}</td>
                    <td className={`font-bold ${m.quantity === 0 ? 'text-red-500' : 'text-amber-500'}`}>{m.quantity}</td>
                    <td className="text-gray-500">{m.location || '—'}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${m.status === 'sold_out' ? 'status-sold-out' : 'status-low-stock'}`}>
                        {m.status === 'sold_out' ? 'אזל מהמלאי' : 'מלאי נמוך'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
