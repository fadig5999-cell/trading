import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userEmail, profile } = await getCurrentProfile();

  if (!userEmail) {
    redirect("/login");
  }

  const fullName = profile?.full_name || userEmail || "משתמש";
  const role = profile?.role ?? "viewer";

  return (
    <AppShell fullName={fullName} role={role}>
      {children}
    </AppShell>
  );
}
