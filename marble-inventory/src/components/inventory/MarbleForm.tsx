"use client";

import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/actions/marble";
import {
  LOCATIONS,
  MARBLE_CATEGORIES,
  MARBLE_COLORS,
  THICKNESS_OPTIONS,
} from "@/lib/constants";
import type { MarbleType } from "@/lib/types";
import { AlertCircle, ImagePlus } from "lucide-react";
import { useActionState, useState } from "react";

export function MarbleForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    state: ActionResult | undefined,
    formData: FormData
  ) => Promise<ActionResult>;
  defaultValues?: Partial<MarbleType>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [preview, setPreview] = useState<string | null>(
    defaultValues?.image_url ?? null
  );

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="md:col-span-2 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name_he">שם השיש בעברית *</Label>
              <Input
                id="name_he"
                name="name_he"
                required
                defaultValue={defaultValues?.name_he}
                placeholder="לדוגמה: קררה לבן"
              />
            </div>
            <div>
              <Label htmlFor="name">שם השיש (אנגלית) *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={defaultValues?.name}
                placeholder="e.g. Carrara White"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="category">קטגוריה</Label>
              <Select id="category" name="category" defaultValue={defaultValues?.category ?? MARBLE_CATEGORIES[0]}>
                {MARBLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="color">צבע</Label>
              <Select id="color" name="color" defaultValue={defaultValues?.color ?? ""}>
                <option value="">בחר צבע</option>
                {MARBLE_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="thickness">עובי</Label>
              <Select id="thickness" name="thickness" defaultValue={defaultValues?.thickness ?? ""}>
                <option value="">בחר עובי</option>
                {THICKNESS_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="size">גודל הלוח</Label>
              <Input
                id="size"
                name="size"
                defaultValue={defaultValues?.size}
                placeholder='לדוגמה: 320x160 ס"מ'
              />
            </div>
            <div>
              <Label htmlFor="quantity">כמות במלאי {defaultValues ? "" : "*"}</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min={0}
                defaultValue={defaultValues?.quantity ?? 0}
                disabled={!!defaultValues}
                required={!defaultValues}
              />
              {defaultValues && (
                <p className="mt-1 text-xs text-muted">
                  לעדכון כמות השתמש בכפתורי &quot;הוסף/הפחת מלאי&quot; בעמוד הפריט
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="low_stock_threshold">סף מלאי נמוך</Label>
              <Input
                id="low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                min={0}
                defaultValue={defaultValues?.low_stock_threshold ?? 3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="location">מיקום באולם / במחסן</Label>
              <Select id="location" name="location" defaultValue={defaultValues?.location ?? ""}>
                <option value="">בחר מיקום</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="cost_price">מחיר עלות (₪)</Label>
              <Input
                id="cost_price"
                name="cost_price"
                type="number"
                step="0.01"
                min={0}
                defaultValue={defaultValues?.cost_price ?? undefined}
              />
            </div>
            <div>
              <Label htmlFor="selling_price">מחיר מכירה (₪)</Label>
              <Input
                id="selling_price"
                name="selling_price"
                type="number"
                step="0.01"
                min={0}
                defaultValue={defaultValues?.selling_price ?? undefined}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={defaultValues?.notes ?? undefined}
              placeholder="מידע נוסף, מקור הלוח, הערות טיפול..."
            />
          </div>
        </div>

        <div>
          <Label htmlFor="image">תמונת הלוח</Label>
          <label
            htmlFor="image"
            className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-chrome-300 bg-chrome-100/40 text-chrome-500 transition hover:border-accent hover:bg-accent-soft/30 overflow-hidden"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="תצוגה מקדימה" className="h-full w-full object-cover" />
            ) : (
              <>
                <ImagePlus size={28} />
                <span className="text-sm">העלה תמונה</span>
              </>
            )}
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
        </div>
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-600/15">
          <AlertCircle size={16} />
          {state.error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "שומר..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
