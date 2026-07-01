import { UserRoleRow } from "@/components/settings/UserRoleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getAllProfiles, getCurrentProfile } from "@/lib/data";
import { ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  const { profile, userEmail } = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const profiles = isAdmin ? await getAllProfiles() : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-chrome-900">הגדרות</h2>
        <p className="text-sm text-muted">ניהול משתמשים, הרשאות ופרטי המערכת</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>החשבון שלי</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          <p className="text-sm text-chrome-800">
            אימייל: <span className="font-medium">{userEmail}</span>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-chrome-800">
            <ShieldCheck size={15} className="text-accent-dark" />
            הרשאה: <span className="font-medium">{isAdmin ? "מנהל מערכת" : "צפייה בלבד"}</span>
          </p>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>ניהול משתמשים והרשאות</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mb-3 text-sm text-muted">
              להוספת משתמש חדש, צור אותו דרך לוח הבקרה של Supabase (Authentication →
              Add User). המשתמש יופיע ברשימה זו באופן אוטומטי ותוכל להגדיר לו הרשאה.
            </p>
            <div className="divide-y divide-chrome-200">
              {profiles.map((p) => (
                <UserRoleRow
                  key={p.id}
                  id={p.id}
                  fullName={p.full_name || "משתמש"}
                  role={p.role}
                  createdAt={p.created_at}
                  isSelf={p.id === profile?.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>אודות המערכת</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm text-chrome-700">
          <p>מערכת ניהול מלאי שיש — נבנתה לניהול מלאי לוחות שיש ואבן טבעית באולם תצוגה.</p>
          <p className="text-muted">
            תפקיד <span className="font-medium text-chrome-800">מנהל</span>: הוספה,
            עריכה, מחיקה, מכירה וניהול מלאי מלא.
          </p>
          <p className="text-muted">
            תפקיד <span className="font-medium text-chrome-800">צפייה</span>: צפייה
            במלאי, בגלריה, בדוחות ובהיסטוריית מכירות בלבד — ללא אפשרות עריכה.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
