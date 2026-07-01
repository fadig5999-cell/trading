import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { Profile } from './types';

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'marble-inventory-secret-key-change-in-production'
);

const COOKIE_NAME = 'marble-session';

export interface SessionUser {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  fullName: string | null;
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as 'admin' | 'viewer',
      fullName: payload.fullName as string | null,
    };
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<SessionUser | null> {
  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role as 'admin' | 'viewer',
    fullName: user.fullName,
  };
}

export async function getUserProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    id: session.id,
    email: session.email,
    full_name: session.fullName,
    role: session.role,
    created_at: '',
    updated_at: '',
  };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error('לא מחובר');
  if (session.role !== 'admin') throw new Error('אין הרשאות מנהל');
  return session;
}
