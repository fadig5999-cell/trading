"use client";

import { Select } from "@/components/ui/Input";
import { updateUserRole } from "@/lib/actions/settings";
import type { UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function UserRoleRow({
  id,
  fullName,
  role,
  createdAt,
  isSelf,
}: {
  id: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  isSelf: boolean;
}) {
  const [value, setValue] = useState(role);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium text-chrome-900">
          {fullName} {isSelf && <span className="text-xs text-accent-dark">(אני)</span>}
        </p>
        <p className="text-xs text-muted">משתמש מאז {formatDate(createdAt)}</p>
      </div>
      <Select
        value={value}
        disabled={isSelf || pending}
        className="w-40"
        onChange={(e) => {
          const newRole = e.target.value as UserRole;
          setValue(newRole);
          startTransition(async () => {
            await updateUserRole(id, newRole);
            router.refresh();
          });
        }}
      >
        <option value="admin">מנהל (עריכה מלאה)</option>
        <option value="viewer">צפייה בלבד</option>
      </Select>
    </div>
  );
}
