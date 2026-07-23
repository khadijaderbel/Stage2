import { cookies } from 'next/headers';
import type { User } from '@/src/types/user';

const SERVER_API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;

export async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getToken();
  if (!token) return null;

  const res = await fetch(`${SERVER_API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return res.json();
}