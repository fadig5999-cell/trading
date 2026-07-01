import { getUserProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const role = profile.role || 'viewer';

  return (
    <div className="min-h-screen">
      <Sidebar role={role} />
      <MobileNav />
      <main className="lg:mr-64 main-content">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
