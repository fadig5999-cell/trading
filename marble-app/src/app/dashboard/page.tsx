'use client'

export const dynamic = 'force-dynamic'

import { useMemo } from 'react'
import Link from 'next/link'
import { useMarbleInventory, useSales } from '@/hooks/useMarble'
import { format, isToday, isThisMonth } from 'date-fns'
import {
  Package,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Gem,
  BarChart3,
} from 'lucide-react'

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  href,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  bgColor: string
  href?: string
}) {
  const content = (
    <div
      className="premium-card p-6 flex items-start gap-4 cursor-pointer"
      style={{ minHeight: 120 }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bgColor }}
      >
        <Icon size={22} color={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold" style={{ color: '#1a1a2e' }}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {href && <ArrowLeft size={16} className="text-gray-300 mt-1" />}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

export default function DashboardPage() {
  const { marbles, loading: marblesLoading } = useMarbleInventory()
  const { sales, loading: salesLoading } = useSales()

  const stats = useMemo(() => {
    const totalTypes = marbles.length
    const totalSlabs = marbles.reduce((sum, m) => sum + m.quantity, 0)
    const lowStockItems = marbles.filter((m) => m.status === 'low_stock').length
    const soldOutItems = marbles.filter((m) => m.status === 'sold_out').length

    const soldToday = sales.filter((s) => isToday(new Date(s.sold_at))).reduce((sum, s) => sum + s.quantity_sold, 0)
    const soldThisMonth = sales.filter((s) => isThisMonth(new Date(s.sold_at))).reduce((sum, s) => sum + s.quantity_sold, 0)

    const inventoryValue = marbles.reduce((sum, m) => {
      if (m.selling_price && m.quantity > 0) return sum + m.selling_price * m.quantity
      return sum
    }, 0)

    const revenueThisMonth = sales
      .filter((s) => isThisMonth(new Date(s.sold_at)))
      .reduce((sum, s) => sum + (s.total_amount || 0), 0)

    return { totalTypes, totalSlabs, lowStockItems, soldOutItems, soldToday, soldThisMonth, inventoryValue, revenueThisMonth }
  }, [marbles, sales])

  const recentSales = sales.slice(0, 5)
  const lowStockMarbles = marbles.filter((m) => m.status === 'low_stock' || m.status === 'sold_out').slice(0, 5)

  if (marblesLoading || salesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#c9a84c' }} />
          <p className="text-gray-500">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 flex items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4e 100%)',
          boxShadow: '0 8px 30px rgba(26,26,46,0.3)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}
        >
          <Gem size={28} color="#1a1a2e" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">ברוך הבא!</h1>
          <p style={{ color: 'rgba(201,168,76,0.8)' }} className="text-sm mt-1">
            {format(new Date(), 'EEEE, dd/MM/yyyy')} • מערכת ניהול מלאי שיש ואבן
          </p>
        </div>
        <div className="mr-auto hidden md:flex gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#c9a84c' }}>{stats.totalTypes}</p>
            <p className="text-xs text-gray-300">סוגי שיש</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#c9a84c' }}>{stats.totalSlabs}</p>
            <p className="text-xs text-gray-300">לוחות במלאי</p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="סוגי שיש"
          value={stats.totalTypes}
          subtitle="סה״כ קטגוריות"
          icon={Gem}
          color="#c9a84c"
          bgColor="rgba(201,168,76,0.1)"
          href="/inventory"
        />
        <KPICard
          title="לוחות במלאי"
          value={stats.totalSlabs}
          subtitle="כל הלוחות"
          icon={Package}
          color="#3b82f6"
          bgColor="rgba(59,130,246,0.1)"
          href="/inventory"
        />
        <KPICard
          title="מלאי נמוך"
          value={stats.lowStockItems}
          subtitle="פחות מ-3 לוחות"
          icon={AlertTriangle}
          color="#f59e0b"
          bgColor="rgba(245,158,11,0.1)"
          href="/inventory?filter=low_stock"
        />
        <KPICard
          title="אזל מהמלאי"
          value={stats.soldOutItems}
          subtitle="לוחות שנגמרו"
          icon={XCircle}
          color="#ef4444"
          bgColor="rgba(239,68,68,0.1)"
          href="/inventory?filter=sold_out"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="נמכר היום"
          value={stats.soldToday}
          subtitle="לוחות שנמכרו היום"
          icon={ShoppingCart}
          color="#10b981"
          bgColor="rgba(16,185,129,0.1)"
          href="/sales"
        />
        <KPICard
          title="נמכר החודש"
          value={stats.soldThisMonth}
          subtitle="לוחות החודש"
          icon={TrendingDown}
          color="#8b5cf6"
          bgColor="rgba(139,92,246,0.1)"
          href="/sales"
        />
        <KPICard
          title="הכנסות החודש"
          value={`₪${stats.revenueThisMonth.toLocaleString()}`}
          subtitle="מכירות החודש"
          icon={DollarSign}
          color="#10b981"
          bgColor="rgba(16,185,129,0.1)"
          href="/reports"
        />
        <KPICard
          title="שווי מלאי"
          value={`₪${stats.inventoryValue.toLocaleString()}`}
          subtitle="לפי מחיר מכירה"
          icon={BarChart3}
          color="#c9a84c"
          bgColor="rgba(201,168,76,0.1)"
          href="/reports"
        />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent sales */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>מכירות אחרונות</h3>
            <Link href="/sales" className="text-sm font-medium" style={{ color: '#c9a84c' }}>
              הכל →
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
              <p>אין מכירות עדיין</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: '#fafafa' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}>
                    <Gem size={16} color="#1a1a2e" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#1a1a2e' }}>
                      {sale.marble_name_hebrew || sale.marble_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(sale.sold_at), 'dd/MM/yyyy HH:mm')}
                      {sale.customer_name && ` • ${sale.customer_name}`}
                    </p>
                  </div>
                  <div className="text-left">
                    {sale.total_amount && (
                      <p className="font-bold text-sm" style={{ color: '#c9a84c' }}>
                        ₪{sale.total_amount.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">{sale.quantity_sold} לוח</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>התראות מלאי</h3>
            <Link href="/inventory" className="text-sm font-medium" style={{ color: '#c9a84c' }}>
              ניהול מלאי →
            </Link>
          </div>
          {lowStockMarbles.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-green-600 font-medium">כל המלאי תקין</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockMarbles.map((marble) => (
                <div key={marble.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: marble.status === 'sold_out' ? '#fff5f5' : '#fffbeb',
                    border: marble.status === 'sold_out' ? '1px solid #fca5a5' : '1px solid #fde68a',
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: marble.status === 'sold_out' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }}>
                    {marble.status === 'sold_out'
                      ? <XCircle size={16} color="#ef4444" />
                      : <AlertTriangle size={16} color="#f59e0b" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#1a1a2e' }}>
                      {marble.name_hebrew || marble.name}
                    </p>
                    <p className="text-xs text-gray-400">{marble.location || 'ללא מיקום'}</p>
                  </div>
                  <div className="text-left">
                    <span className={`text-sm font-bold ${marble.status === 'sold_out' ? 'text-red-600' : 'text-amber-600'}`}>
                      {marble.quantity} לוחות
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
