'use client'

import { useState } from 'react'
import { X, ShoppingCart } from 'lucide-react'
import { MarbleType } from '@/lib/supabase'

type SellModalProps = {
  marble: MarbleType
  onConfirm: (customerInfo: { customer_name?: string; customer_phone?: string; notes?: string }) => void
  onClose: () => void
}

export default function SellModal({ marble, onConfirm, onClose }: SellModalProps) {
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', notes: '' })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-8" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}>
              <ShoppingCart size={20} color="#1a1a2e" />
            </div>
            <div>
              <h3 className="text-xl font-bold" style={{ color: '#1a1a2e' }}>מכירת לוח</h3>
              <p className="text-sm text-gray-500">{marble.name_hebrew || marble.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Marble info */}
        <div className="p-4 rounded-xl mb-6"
          style={{ background: 'linear-gradient(135deg, #f8f4ec, #fdf9f0)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">שם:</span>
              <span className="font-semibold mr-2" style={{ color: '#1a1a2e' }}>{marble.name_hebrew || marble.name}</span>
            </div>
            <div>
              <span className="text-gray-500">כמות זמינה:</span>
              <span className="font-bold mr-2" style={{ color: '#1a1a2e' }}>{marble.quantity} לוחות</span>
            </div>
            {marble.selling_price && (
              <div>
                <span className="text-gray-500">מחיר:</span>
                <span className="font-bold mr-2" style={{ color: '#c9a84c' }}>₪{marble.selling_price.toLocaleString()}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">מיקום:</span>
              <span className="font-medium mr-2 text-gray-700">{marble.location || '—'}</span>
            </div>
          </div>
        </div>

        {/* Customer info */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-gray-700">פרטי לקוח (אופציונלי)</h4>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">שם לקוח</label>
            <input
              type="text"
              className="form-input"
              placeholder="שם הלקוח"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">טלפון</label>
            <input
              type="tel"
              className="form-input"
              placeholder="050-0000000"
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">הערות</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="הערות נוספות..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            ביטול
          </button>
          <button
            onClick={() => onConfirm(form)}
            disabled={marble.quantity <= 0}
            className="flex-1 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
            style={{
              background: marble.quantity <= 0
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #c9a84c, #e8d5a3)',
              color: marble.quantity <= 0 ? '#9ca3af' : '#1a1a2e',
            }}
          >
            <ShoppingCart size={18} />
            {marble.quantity <= 0 ? 'אזל מהמלאי' : 'אשר מכירה'}
          </button>
        </div>
      </div>
    </div>
  )
}
