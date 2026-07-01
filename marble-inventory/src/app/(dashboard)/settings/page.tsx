import { getUserProfile } from '@/lib/actions';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { User, Shield, Mail } from 'lucide-react';

export default async function SettingsPage() {
  const profile = await getUserProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">הגדרות</h1>
        <p className="text-sm text-zinc-500 mt-1">הגדרות חשבון ומערכת</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-zinc-500" />
            <h2 className="font-semibold">פרטי חשבון</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Mail className="w-4 h-4" />
              אימייל
            </div>
            <span className="text-sm font-medium" dir="ltr">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Shield className="w-4 h-4" />
              תפקיד
            </div>
            <Badge variant={profile?.role === 'admin' ? 'primary' : 'default'}>
              {profile?.role === 'admin' ? 'מנהל' : 'צופה'}
            </Badge>
          </div>
          {profile?.full_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">שם</span>
              <span className="text-sm font-medium">{profile.full_name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">אודות המערכת</h2>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">גרסה</dt>
              <dd className="font-medium">1.0.0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">שפה</dt>
              <dd className="font-medium">עברית (RTL)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">מטבע</dt>
              <dd className="font-medium">שקל חדש (₪)</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {profile?.role === 'viewer' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          חשבונך מוגדר כצופה. לעריכת מלאי ומכירות, פנה למנהל המערכת לשדרוג ההרשאות.
        </div>
      )}
    </div>
  );
}
