import { NextResponse } from 'next/server';
import { login, createSession } from '@/lib/auth';
import { seedDatabase } from '@/lib/db/seed';
import { initDatabase } from '@/lib/db';

let seeded = false;

export async function POST(request: Request) {
  if (!seeded) {
    initDatabase();
    await seedDatabase();
    seeded = true;
  }

  const { email, password } = await request.json();
  const user = await login(email, password);

  if (!user) {
    return NextResponse.json({ error: 'אימייל או סיסמה שגויים' }, { status: 401 });
  }

  await createSession(user);
  return NextResponse.json({ success: true });
}
