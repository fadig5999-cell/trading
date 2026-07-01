'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Gem, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError('אימייל או סיסמה שגויים');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-zinc-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-zinc-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-xl mb-4">
            <Gem className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">ניהול מלאי שיש</h1>
          <p className="text-sm text-zinc-500 mt-1">מערכת ניהול מקצועית לעסקי שיש ואבן</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 p-8">
          <div className="flex items-center gap-2 mb-6 text-zinc-600">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">כניסה למערכת</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            <Input
              label="אימייל"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              dir="ltr"
              placeholder="admin@marble.co.il"
            />
            <Input
              label="סיסמה"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              dir="ltr"
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              התחבר
            </Button>
          </form>

          <div className="mt-6 p-3 bg-zinc-50 rounded-lg text-xs text-zinc-500 space-y-1">
            <p className="font-medium text-zinc-600">חשבונות דמו:</p>
            <p dir="ltr">admin@marble.co.il / admin123 (מנהל)</p>
            <p dir="ltr">viewer@marble.co.il / viewer123 (צופה)</p>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          מערכת מאובטחת לניהול מלאי שיש ואבן טבעית
        </p>
      </div>
    </div>
  );
}
