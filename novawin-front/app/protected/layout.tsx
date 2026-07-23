import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/src/lib/auth';
import AppShell from '@/src/components/AppShell';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <AppShell user={user}>{children}</AppShell>;
}