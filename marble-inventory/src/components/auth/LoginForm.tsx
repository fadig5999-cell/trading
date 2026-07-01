"use client";

import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { AlertCircle, Lock, Mail } from "lucide-react";
import { useActionState } from "react";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">כתובת אימייל</Label>
        <div className="relative">
          <Mail
            size={18}
            className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-chrome-400"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="owner@showroom.co.il"
            required
            className="pe-10"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password">סיסמה</Label>
        <div className="relative">
          <Lock
            size={18}
            className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-chrome-400"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="pe-10"
          />
        </div>
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-600/15">
          <AlertCircle size={16} />
          {state.error}
        </div>
      )}

      <Button type="submit" fullWidth size="lg" disabled={pending}>
        {pending ? "מתחבר..." : "התחברות"}
      </Button>
    </form>
  );
}
