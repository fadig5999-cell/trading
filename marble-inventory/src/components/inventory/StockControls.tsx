'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { sellOneSlab, updateStock } from '@/lib/actions';
import type { MarbleType } from '@/lib/types';
import { Plus, Minus, ShoppingBag, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StockControlsProps {
  marble: MarbleType;
  isAdmin: boolean;
}

export function StockControls({ marble, isAdmin }: StockControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [manualQty, setManualQty] = useState(marble.quantity.toString());
  const [error, setError] = useState('');

  if (!isAdmin) return null;

  const handleAction = async (action: string, fn: () => Promise<unknown>) => {
    setLoading(action);
    setError('');
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setLoading(null);
    }
  };

  const handleSell = async () => {
    await handleAction('sell', () =>
      sellOneSlab(marble.id, {
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        notes: saleNotes || undefined,
      })
    );
    setSellModalOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setSaleNotes('');
  };

  const handleManualUpdate = async () => {
    const qty = parseInt(manualQty);
    if (isNaN(qty) || qty < 0) {
      setError('כמות לא תקינה');
      return;
    }
    await handleAction('manual', () => updateStock(marble.id, qty, 'manual'));
    setManualModalOpen(false);
  };

  return (
    <>
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={loading === 'sell'}
          disabled={marble.quantity === 0}
          onClick={() => setSellModalOpen(true)}
        >
          <ShoppingBag className="w-4 h-4" />
          מכור לוח
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={loading === 'add'}
          onClick={() => handleAction('add', () => updateStock(marble.id, 1, 'add'))}
        >
          <Plus className="w-4 h-4" />
          הוסף מלאי
        </Button>
        <Button
          size="sm"
          variant="outline"
          loading={loading === 'remove'}
          disabled={marble.quantity === 0}
          onClick={() => handleAction('remove', () => updateStock(marble.id, -1, 'remove'))}
        >
          <Minus className="w-4 h-4" />
          הפחת מלאי
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setManualQty(marble.quantity.toString());
            setManualModalOpen(true);
          }}
        >
          <Edit3 className="w-4 h-4" />
          ערוך כמות
        </Button>
      </div>

      <Modal
        isOpen={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        title="מכירת לוח"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            מכירת לוח אחד של <strong>{marble.hebrew_name}</strong>
            <br />
            כמות נוכחית: {marble.quantity} | לאחר מכירה: {marble.quantity - 1}
          </p>
          <Input
            label="שם לקוח (אופציונלי)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
          <Input
            label="טלפון (אופציונלי)"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            dir="ltr"
          />
          <Input
            label="הערות (אופציונלי)"
            value={saleNotes}
            onChange={e => setSaleNotes(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSellModalOpen(false)}>ביטול</Button>
            <Button loading={loading === 'sell'} onClick={handleSell}>אישור מכירה</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="עריכת כמות ידנית"
      >
        <div className="space-y-4">
          <Input
            label="כמות במלאי"
            type="number"
            min="0"
            value={manualQty}
            onChange={e => setManualQty(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setManualModalOpen(false)}>ביטול</Button>
            <Button loading={loading === 'manual'} onClick={handleManualUpdate}>שמור</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
