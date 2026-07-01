"use client";

import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { adjustStock, sellSlab, setStockQuantity } from "@/lib/actions/marble";
import { AlertCircle, Minus, Pencil, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ModalKind = "sell" | "add" | "remove" | "edit" | null;

export function StockControls({
  marbleTypeId,
  quantity,
  sellingPrice,
  compact = false,
}: {
  marbleTypeId: string;
  quantity: number;
  sellingPrice: number | null;
  compact?: boolean;
}) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const close = () => {
    setModal(null);
    setError(null);
  };

  function handleSellOneClick() {
    setError(null);
    startTransition(async () => {
      const res = await sellSlab(marbleTypeId, {
        quantity: 1,
        salePrice: sellingPrice,
      });
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"}>
        <Button
          size={compact ? "sm" : "md"}
          variant="secondary"
          onClick={handleSellOneClick}
          disabled={quantity <= 0 || pending}
          className={compact ? "" : "col-span-2"}
        >
          <ShoppingBag size={16} />
          מכור לוח
        </Button>
        <Button size={compact ? "sm" : "md"} variant="outline" onClick={() => setModal("add")}>
          <Plus size={16} />
          הוסף מלאי
        </Button>
        <Button
          size={compact ? "sm" : "md"}
          variant="outline"
          onClick={() => setModal("remove")}
          disabled={quantity <= 0}
        >
          <Minus size={16} />
          הפחת מלאי
        </Button>
        {!compact && (
          <Button size="md" variant="ghost" onClick={() => setModal("edit")}>
            <Pencil size={16} />
            עדכן כמות ידנית
          </Button>
        )}
      </div>

      {error && !modal && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <SellModal
        open={modal === "sell"}
        onClose={close}
        marbleTypeId={marbleTypeId}
        maxQuantity={quantity}
        defaultPrice={sellingPrice}
      />
      <AdjustModal
        open={modal === "add"}
        onClose={close}
        marbleTypeId={marbleTypeId}
        mode="add"
      />
      <AdjustModal
        open={modal === "remove"}
        onClose={close}
        marbleTypeId={marbleTypeId}
        mode="remove"
        maxQuantity={quantity}
      />
      <EditQuantityModal
        open={modal === "edit"}
        onClose={close}
        marbleTypeId={marbleTypeId}
        currentQuantity={quantity}
      />
    </>
  );
}

export function SellModal({
  open,
  onClose,
  marbleTypeId,
  maxQuantity,
  defaultPrice,
}: {
  open: boolean;
  onClose: () => void;
  marbleTypeId: string;
  maxQuantity: number;
  defaultPrice: number | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Modal open={open} onClose={onClose} title="מכירת לוחות" description="פרטי המכירה יישמרו בהיסטוריית המכירות">
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const qty = Number(formData.get("quantity") || 1);
            const price = formData.get("price");
            const res = await sellSlab(marbleTypeId, {
              quantity: qty,
              salePrice: price ? Number(price) : defaultPrice,
              customerName: String(formData.get("customer_name") || "") || null,
              customerPhone: String(formData.get("customer_phone") || "") || null,
              notes: String(formData.get("notes") || "") || null,
            });
            if (res.error) {
              setError(res.error);
            } else {
              router.refresh();
              onClose();
            }
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="quantity">כמות לוחות</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              max={maxQuantity}
              defaultValue={1}
              required
            />
          </div>
          <div>
            <Label htmlFor="price">מחיר מכירה (₪)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              defaultValue={defaultPrice ?? undefined}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="customer_name">שם לקוח (אופציונלי)</Label>
          <Input id="customer_name" name="customer_name" />
        </div>
        <div>
          <Label htmlFor="customer_phone">טלפון לקוח (אופציונלי)</Label>
          <Input id="customer_phone" name="customer_phone" type="tel" />
        </div>
        <div>
          <Label htmlFor="notes">הערות (אופציונלי)</Label>
          <Textarea id="notes" name="notes" rows={2} />
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "מבצע מכירה..." : "אישור מכירה"}
        </Button>
      </form>
    </Modal>
  );
}

function AdjustModal({
  open,
  onClose,
  marbleTypeId,
  mode,
  maxQuantity,
}: {
  open: boolean;
  onClose: () => void;
  marbleTypeId: string;
  mode: "add" | "remove";
  maxQuantity?: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "הוספת מלאי" : "הפחתת מלאי"}
      description={
        mode === "add"
          ? "הוסף לוחות שהתקבלו מספק או מהזמנה חדשה"
          : "הפחת לוחות שהתקלקלו, נשברו או הועברו למקום אחר"
      }
    >
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const qty = Math.abs(Number(formData.get("quantity") || 0));
            const reason = String(formData.get("reason") || "");
            const res = await adjustStock(
              marbleTypeId,
              mode === "add" ? qty : -qty,
              mode,
              reason || undefined
            );
            if (res.error) {
              setError(res.error);
            } else {
              router.refresh();
              onClose();
            }
          });
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="quantity">כמות</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={mode === "remove" ? maxQuantity : undefined}
            defaultValue={1}
            required
          />
        </div>
        <div>
          <Label htmlFor="reason">סיבה (אופציונלי)</Label>
          <Input
            id="reason"
            name="reason"
            placeholder={mode === "add" ? "לדוגמה: הזמנה מספק" : "לדוגמה: נזק בהעמסה"}
          />
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <Button type="submit" fullWidth variant={mode === "add" ? "primary" : "outline"} disabled={pending}>
          {pending ? "מעדכן..." : mode === "add" ? "הוסף מלאי" : "הפחת מלאי"}
        </Button>
      </form>
    </Modal>
  );
}

function EditQuantityModal({
  open,
  onClose,
  marbleTypeId,
  currentQuantity,
}: {
  open: boolean;
  onClose: () => void;
  marbleTypeId: string;
  currentQuantity: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Modal open={open} onClose={onClose} title="עדכון כמות ידני" description="קבע כמות מלאי מדויקת עבור פריט זה">
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const qty = Math.max(0, Number(formData.get("quantity") ?? currentQuantity));
            const res = await setStockQuantity(marbleTypeId, qty);
            if (res.error) {
              setError(res.error);
            } else {
              router.refresh();
              onClose();
            }
          });
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="quantity">כמות מלאי חדשה</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={0}
            defaultValue={currentQuantity}
            required
          />
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "מעדכן..." : "שמור כמות"}
        </Button>
      </form>
    </Modal>
  );
}
