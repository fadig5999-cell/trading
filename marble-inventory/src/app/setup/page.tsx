import { Gem, KeyRound, Database, Rocket } from "lucide-react";

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-chrome-900 px-4 py-12 text-chrome-100">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-chrome-100 to-chrome-300 shadow-lg">
            <Gem className="text-chrome-800" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            שלב אחרון — חיבור מסד הנתונים
          </h1>
          <p className="mt-2 text-sm text-chrome-400">
            המערכת מוכנה, אך עדיין לא הוגדר חיבור ל-Supabase. בצע את הצעדים הבאים כדי להפעיל אותה במלואה.
          </p>
        </div>

        <div className="space-y-4">
          <Step
            icon={Database}
            title="1. צור פרויקט Supabase חינמי"
            body='היכנס אל supabase.com, צור חשבון ופרויקט חדש (בחר אזור קרוב, למשל Frankfurt). זה נמשך כ-2 דקות.'
          />
          <Step
            icon={Rocket}
            title="2. הרץ את קובץ ההתקנה"
            body="בלוח הבקרה של הפרויקט עבור אל SQL Editor, הדבק את תוכן הקובץ supabase/migrations/0001_init.sql מהריפוזיטורי והרץ אותו. זה יוצר את כל הטבלאות, ההרשאות ואת מאגר התמונות."
          />
          <Step
            icon={KeyRound}
            title="3. הגדר משתני סביבה"
            body="בהגדרות הפרויקט (Project Settings → API) העתק את Project URL ואת anon key, והגדר אותם כמשתני סביבה: NEXT_PUBLIC_SUPABASE_URL ו-NEXT_PUBLIC_SUPABASE_ANON_KEY."
          />
          <Step
            icon={Gem}
            title="4. צור משתמש מנהל"
            body="ב-Authentication → Users צור משתמש עם אימייל וסיסמה. המשתמש הראשון שנוצר יהפוך אוטומטית למנהל מערכת (Admin)."
          />
        </div>

        <p className="mt-8 text-center text-xs text-chrome-500">
          לאחר הגדרת משתני הסביבה, רענן/פרסם מחדש את האתר — המערכת תפעל באופן מלא.
        </p>
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="luxury-card flex gap-3 !border-white/10 !bg-white/[0.04] p-4 text-chrome-200 backdrop-blur">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft/20 text-accent">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-chrome-400">{body}</p>
      </div>
    </div>
  );
}
