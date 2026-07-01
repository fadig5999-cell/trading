'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, MarbleType, Sale } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function useMarbleInventory() {
  const [marbles, setMarbles] = useState<MarbleType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarbles = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('marble_types')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
      toast.error('שגיאה בטעינת המלאי')
    } else {
      setMarbles(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMarbles()
  }, [fetchMarbles])

  const sellSlab = async (marble: MarbleType, customerInfo?: {
    customer_name?: string
    customer_phone?: string
    notes?: string
  }) => {
    if (marble.quantity <= 0) {
      toast.error('אין יותר לוחות במלאי')
      return false
    }

    const newQuantity = marble.quantity - 1

    const { error: updateError } = await supabase
      .from('marble_types')
      .update({ quantity: newQuantity })
      .eq('id', marble.id)

    if (updateError) {
      toast.error('שגיאה בעדכון המלאי')
      return false
    }

    await supabase.from('sales').insert({
      marble_type_id: marble.id,
      marble_name: marble.name,
      marble_name_hebrew: marble.name_hebrew,
      quantity_sold: 1,
      selling_price: marble.selling_price,
      total_amount: marble.selling_price,
      customer_name: customerInfo?.customer_name || null,
      customer_phone: customerInfo?.customer_phone || null,
      notes: customerInfo?.notes || null,
    })

    await supabase.from('stock_movements').insert({
      marble_type_id: marble.id,
      marble_name: marble.name,
      movement_type: 'sell',
      quantity_change: -1,
      quantity_before: marble.quantity,
      quantity_after: newQuantity,
      notes: 'מכירת לוח',
    })

    toast.success(`נמכר לוח ${marble.name_hebrew || marble.name}`)
    fetchMarbles()
    return true
  }

  const addStock = async (marble: MarbleType, amount: number) => {
    const newQuantity = marble.quantity + amount
    const { error } = await supabase
      .from('marble_types')
      .update({ quantity: newQuantity })
      .eq('id', marble.id)

    if (error) {
      toast.error('שגיאה בהוספת מלאי')
      return false
    }

    await supabase.from('stock_movements').insert({
      marble_type_id: marble.id,
      marble_name: marble.name,
      movement_type: 'add',
      quantity_change: amount,
      quantity_before: marble.quantity,
      quantity_after: newQuantity,
      notes: `הוספת ${amount} לוחות`,
    })

    toast.success(`נוספו ${amount} לוחות ל-${marble.name_hebrew || marble.name}`)
    fetchMarbles()
    return true
  }

  const removeStock = async (marble: MarbleType, amount: number) => {
    const newQuantity = Math.max(0, marble.quantity - amount)
    const { error } = await supabase
      .from('marble_types')
      .update({ quantity: newQuantity })
      .eq('id', marble.id)

    if (error) {
      toast.error('שגיאה בהפחתת מלאי')
      return false
    }

    await supabase.from('stock_movements').insert({
      marble_type_id: marble.id,
      marble_name: marble.name,
      movement_type: 'remove',
      quantity_change: -amount,
      quantity_before: marble.quantity,
      quantity_after: newQuantity,
      notes: `הפחתת ${amount} לוחות`,
    })

    toast.success(`הופחתו ${amount} לוחות מ-${marble.name_hebrew || marble.name}`)
    fetchMarbles()
    return true
  }

  const updateQuantity = async (marble: MarbleType, newQuantity: number) => {
    const qty = Math.max(0, newQuantity)
    const { error } = await supabase
      .from('marble_types')
      .update({ quantity: qty })
      .eq('id', marble.id)

    if (error) {
      toast.error('שגיאה בעדכון כמות')
      return false
    }

    await supabase.from('stock_movements').insert({
      marble_type_id: marble.id,
      marble_name: marble.name,
      movement_type: 'manual_adjust',
      quantity_change: qty - marble.quantity,
      quantity_before: marble.quantity,
      quantity_after: qty,
      notes: 'עדכון ידני',
    })

    toast.success('הכמות עודכנה בהצלחה')
    fetchMarbles()
    return true
  }

  const addMarble = async (data: Omit<MarbleType, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('marble_types').insert(data)
    if (error) {
      toast.error('שגיאה בהוספת סוג שיש')
      return false
    }
    toast.success('סוג שיש חדש נוסף בהצלחה')
    fetchMarbles()
    return true
  }

  const updateMarble = async (id: string, data: Partial<MarbleType>) => {
    const { error } = await supabase
      .from('marble_types')
      .update(data)
      .eq('id', id)

    if (error) {
      toast.error('שגיאה בעדכון הנתונים')
      return false
    }
    toast.success('הנתונים עודכנו בהצלחה')
    fetchMarbles()
    return true
  }

  const deleteMarble = async (id: string) => {
    const { error } = await supabase
      .from('marble_types')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('שגיאה במחיקה')
      return false
    }
    toast.success('הפריט נמחק')
    fetchMarbles()
    return true
  }

  return {
    marbles,
    loading,
    error,
    fetchMarbles,
    sellSlab,
    addStock,
    removeStock,
    updateQuantity,
    addMarble,
    updateMarble,
    deleteMarble,
  }
}

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSales = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false })

    if (!error) setSales(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  return { sales, loading, fetchSales }
}
