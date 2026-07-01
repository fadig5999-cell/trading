'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createMarbleType, updateMarbleType, uploadImage } from '@/lib/actions';
import type { MarbleType } from '@/lib/types';
import Image from 'next/image';
import { Upload } from 'lucide-react';

interface MarbleFormProps {
  marble?: MarbleType;
  mode: 'create' | 'edit';
}

export function MarbleForm({ marble, mode }: MarbleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(marble?.image_url || '');
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = await uploadImage(formData);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאת תמונה');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    if (imageUrl) formData.set('image_url', imageUrl);

    try {
      if (mode === 'create') {
        await createMarbleType(formData);
        router.push('/inventory');
      } else if (marble) {
        await updateMarbleType(marble.id, formData);
        router.push(`/inventory/${marble.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="hebrew_name" label="שם בעברית *" required defaultValue={marble?.hebrew_name} />
        <Input name="name" label="שם באנגלית *" required defaultValue={marble?.name} dir="ltr" />
        <Input name="category" label="קטגוריה" defaultValue={marble?.category || ''} />
        <Input name="color" label="צבע" defaultValue={marble?.color || ''} />
        <Input name="thickness" label="עובי" defaultValue={marble?.thickness || ''} />
        <Input name="size" label="גודל" defaultValue={marble?.size || ''} />
        {mode === 'create' && (
          <Input name="quantity" label="כמות" type="number" min="0" defaultValue="0" />
        )}
        <Input name="location" label="מיקום" defaultValue={marble?.location || ''} />
        <Input name="cost_price" label="מחיר עלות (₪)" type="number" min="0" step="0.01" defaultValue={marble?.cost_price || ''} />
        <Input name="selling_price" label="מחיר מכירה (₪)" type="number" min="0" step="0.01" defaultValue={marble?.selling_price || ''} />
      </div>

      <Textarea name="notes" label="הערות" defaultValue={marble?.notes || ''} />

      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700">תמונה</label>
        {imageUrl && (
          <div className="relative w-48 h-36 rounded-lg overflow-hidden border border-zinc-200">
            <Image src={imageUrl} alt="תמונת שיש" fill className="object-cover" />
          </div>
        )}
        <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors w-fit">
          <Upload className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-600">
            {uploading ? 'מעלה...' : 'העלה תמונה'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
        </label>
        <Input
          label="או הדבק קישור לתמונה"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          dir="ltr"
          placeholder="https://..."
        />
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
        <Button type="button" variant="ghost" onClick={() => router.back()}>ביטול</Button>
        <Button type="submit" loading={loading}>
          {mode === 'create' ? 'הוסף סוג שיש' : 'שמור שינויים'}
        </Button>
      </div>
    </form>
  );
}
