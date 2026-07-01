# ניהול מלאי שיש ואבן | Marble Inventory Management System

מערכת ניהול מלאי מקצועית לתצוגת שיש ואבן — בנויה עם Next.js, Supabase וממשק עברי RTL.

---

## תכונות עיקריות

- **לוח בקרה** — סטטיסטיקות מכירות, מלאי, התראות מלאי נמוך
- **ניהול מלאי** — תצוגת טבלה וכרטיסיות, חיפוש, סינון לפי צבע / קטגוריה / עובי / סטטוס
- **מכירת לוח** — לחיצה אחת מפחיתה את הכמות ושומרת את המכירה בהיסטוריה
- **הוספה / עריכה / מחיקה** — טפסים מלאים עם העלאת תמונה
- **היסטוריית מכירות** — כל מכירה עם פרטי לקוח, תאריך, מחיר
- **גלריית שיש** — תצוגה ויזואלית עם תמונות
- **דוחות** — גרפים, מוצרים נמכרים ביותר, שווי מלאי
- **הגדרות** — ניהול חשבון ושינוי סיסמה

---

## הגדרת Supabase

### 1. צור חשבון בחינם
עבור ל-[supabase.com](https://supabase.com) וצור חשבון ופרויקט חדש.

### 2. הפעל את ה-Schema
ב-Supabase Dashboard → SQL Editor, הפעל את כל התוכן של הקובץ `supabase-schema.sql`.

### 3. צור Bucket לתמונות
ב-Supabase Dashboard → Storage:
- לחץ "New bucket"
- שם: `marble-images`
- סמן "Public bucket"

### 4. הוסף משתמש Admin
ב-Supabase Dashboard → Authentication → Users → "Add user":
- הזן אימייל וסיסמה עבור המנהל

### 5. הגדר Variables
ערוך את קובץ `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
(מפתחות נמצאים ב-Project Settings → API)

---

## הפעלה מקומית

```bash
cd marble-app
npm install
npm run dev
```
פתח [http://localhost:3000](http://localhost:3000)

---

## פרסום ב-Vercel

1. Push לגיטהאב
2. ייבא ב-[vercel.com](https://vercel.com)
3. הוסף Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

---

## מבנה הפרויקט

```
src/
├── app/
│   ├── login/          # דף כניסה
│   ├── dashboard/      # לוח בקרה
│   ├── inventory/      # ניהול מלאי
│   ├── sales/          # היסטוריית מכירות
│   ├── gallery/        # גלריה
│   ├── reports/        # דוחות
│   └── settings/       # הגדרות
├── components/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── SellModal.tsx
│   ├── MarbleFormModal.tsx
│   └── StatusBadge.tsx
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   └── useMarble.ts
└── lib/
    └── supabase.ts
```

---

## טכנולוגיות

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
