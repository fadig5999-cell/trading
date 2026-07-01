"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deleteMarbleType } from "@/lib/actions/marble";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteButton({
  marbleTypeId,
  nameHe,
  redirectTo,
  size = "md",
}: {
  marbleTypeId: string;
  nameHe: string;
  redirectTo?: string;
  size?: "sm" | "md" | "lg" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <Button variant="danger" size={size} onClick={() => setOpen(true)}>
        <Trash2 size={16} />
        {size !== "icon" && "מחק"}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="מחיקת פריט">
        <p className="text-sm text-chrome-700">
          האם אתה בטוח שברצונך למחוק את הפריט{" "}
          <span className="font-semibold">&quot;{nameHe}&quot;</span>? פעולה זו אינה
          הפיכה והיסטוריית המכירות הקשורה תימחק גם היא.
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-2">
          <Button
            variant="danger"
            fullWidth
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteMarbleType(marbleTypeId);
                if (res.error) {
                  setError(res.error);
                  return;
                }
                setOpen(false);
                if (redirectTo) {
                  router.push(redirectTo);
                } else {
                  router.refresh();
                }
              })
            }
          >
            {pending ? "מוחק..." : "מחק לצמיתות"}
          </Button>
          <Button variant="outline" fullWidth onClick={() => setOpen(false)}>
            ביטול
          </Button>
        </div>
      </Modal>
    </>
  );
}
