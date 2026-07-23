import { getCurrentUser } from '@/src/lib/auth';
import AppShell from '@/src/components/AppShell';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <AppShell user={user}>{children}</AppShell>;
}