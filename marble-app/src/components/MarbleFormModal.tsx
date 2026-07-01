'use client'

import { useState, useRef } from 'react'
import { X, Upload, Gem } from 'lucide-react'
import { MarbleType } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type FormData = {
  name: string
  name_hebrew: string
  category: string
  color: string
  thickness: string
  size: string
  quantity: number
  location: string
  image_url: string
  cost_price: string
  selling_price: string
  notes: string
}

type Props = {
  marble?: MarbleType
  onSave: (data: Omit<MarbleType, 'id' | 'status' | 'created_at' | 'updated_at'>) => void
  onClose: () => void
}

const CATEGORIES = ['שיש', 'גרניט', 'קוורץ', 'טרוורטין', 'אונקס', 'אחר']
const COLORS = ['לבן', 'שחור', 'אפור', 'בז׳', 'חום', 'ירוק', 'כחול', 'אדום', 'זהב', 'כתום', 'לבן-זהב', 'אחר']
const THICKNESSES = ['1 ס"מ', '2 ס"מ', '3 ס"מ', '4 ס"מ', 'אחר']

export default function MarbleFormModal({ marble, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormData>({
    name: marble?.name || '',
    name_hebrew: marble?.name_hebrew || '',
    category: marble?.category || 'שיש',
    color: marble?.color || '',
    thickness: marble?.thickness || '2 ס"מ',
    size: marble?.size || '',
    quantity: marble?.quantity || 0,
    location: marble?.location || '',
    image_url: marble?.image_url || '',
    cost_price: marble?.cost_price?.toString() || '',
    selling_price: marble?.selling_price?.toString() || '',
    notes: marble?.notes || '',
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('marble-images')
      .upload(fileName, file)

    if (error) {
      toast.error('שגיאה בהעלאת התמונה. ודא שה-bucket קיים.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('marble-images')
      .getPublicUrl(data.path)

    setForm({ ...form, image_url: publicUrl })
    toast.success('התמונה הועלתה בהצלחה')
    setUploading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) {
      toast.error('שם השיש הוא שדה חובה')
      return
    }
    onSave({
      name: form.name,
      name_hebrew: form.name_hebrew,
      category: form.category,
      color: form.color,
      thickness: form.thickness,
      size: form.size,
      quantity: Number(form.quantity),
      location: form.location,
      image_url: form.image_url || null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      selling_price: form.selling_price ? Number(form.selling_price) : null,
      notes: form.notes || null,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '700px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8d5a3)' }}>
              <Gem size={20} color="#1a1a2e" />
            </div>
            <h3 className="text-xl font-bold" style={{ color: '#1a1a2e' }}>
              {marble ? 'עריכת סוג שיש' : 'הוספת סוג שיש חדש'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image upload */}
          <div className="flex items-start gap-4">
            <div
              className="w-28 h-28 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer group relative"
              style={{ border: '2px dashed rgba(201,168,76,0.4)', background: '#fafaf8' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="marble" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-xs text-gray-400">העלה תמונה</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">שם באנגלית *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Carrara White"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">שם בעברית</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="קררה לבן"
                  value={form.name_hebrew}
                  onChange={(e) => setForm({ ...form, name_hebrew: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Category, Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">קטגוריה</label>
              <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">צבע</label>
              <select className="form-input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                <option value="">בחר צבע</option>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Thickness, Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">עובי</label>
              <select className="form-input" value={form.thickness} onChange={(e) => setForm({ ...form, thickness: e.target.value })}>
                {THICKNESSES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">מידות</label>
              <input
                type="text"
                className="form-input"
                placeholder='300x150 ס"מ'
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
            </div>
          </div>

          {/* Quantity, Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">כמות במלאי</label>
              <input
                type="number"
                min="0"
                className="form-input"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">מיקום</label>
              <input
                type="text"
                className="form-input"
                placeholder="מחסן א - שורה 1"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">מחיר עלות (₪)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">מחיר מכירה (₪)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">הערות</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="הערות נוספות על השיש..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              ביטול
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)',
                color: '#c9a84c',
              }}
            >
              {marble ? 'שמור שינויים' : 'הוסף סוג שיש'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
