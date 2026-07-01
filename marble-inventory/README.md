# ניהול מלאי שיש - Marble Inventory Management

מערכת ניהול מלאי מקצועית לעסקי שיש ואבן טבעית בישראל.

## Live Demo

**URL:** https://galaxy-update-interest-amsterdam.trycloudflare.com

### חשבונות כניסה

| תפקיד | אימייל | סיסמה |
|--------|--------|-------|
| מנהל | admin@marble.co.il | admin123 |
| צופה | viewer@marble.co.il | viewer123 |

## תכונות

- **לוח בקרה** - סקירה כללית: סוגי שיש, לוחות במלאי, מלאי נמוך, מכירות
- **ניהול מלאי** - הוספה, עריכה, מחיקה, סינון וחיפוש
- **מכירות** - מכירת לוח בלחיצה ("מכור לוח") עם היסטוריה מלאה
- **גלריה** - תצוגה ויזואלית יוקרתית של כל סוגי השיש
- **דוחות** - הנמכרים ביותר, שווי מלאי, מכירות חודשיות
- **הרשאות** - מנהל (עריכה) / צופה (צפייה בלבד)
- **ממשק עברי RTL** - מותאם לעסקים בישראל
- **מובייל** - עובד מצוין בטלפון ובמחשב

## התקנה מקומית

```bash
cd marble-inventory
npm install
npm run db:seed
npm run dev
```

פתח http://localhost:3000

## פריסה לייצור (Vercel)

1. דחוף ל-GitHub
2. חבר ל-[Vercel](https://vercel.com)
3. הגדר משתני סביבה:
   - `AUTH_SECRET` - מפתח סודי לאימות (מחרוזת אקראית)
4. הערה: מסד הנתונים SQLite נשמר בקובץ `data/marble.db`. לפריסה קבועה ב-Vercel, מומלץ לעבור ל-Supabase (ראה `supabase/schema.sql`)

## מבנה הפרויקט

```
src/
  app/              # דפי האפליקציה
  components/       # רכיבי UI
  lib/
    db/             # SQLite + Drizzle ORM
    auth.ts         # אימות JWT
    actions.ts      # Server Actions
supabase/           # סכמת Supabase (לפריסה עתידית)
```

## טכנולוגיות

- Next.js 16 (App Router, Server Actions)
- SQLite + Drizzle ORM (מסד נתונים קבוע)
- JWT Authentication (jose + bcrypt)
- Tailwind CSS 4
- TypeScript
- Hebrew RTL (Heebo font)

## כפתורים עיקריים

| כפתור | פעולה |
|--------|--------|
| מכור לוח | מוריד 1 מהמלאי ושומר מכירה |
| הוסף מלאי | מוסיף 1 לכמות |
| הפחת מלאי | מוריד 1 (לא מכירה) |
| ערוך כמות | עדכון ידני |
| הוסף סוג שיש | הוספת סוג חדש |

## סטטוס מלאי

- **במלאי** - 3 לוחות ומעלה
- **מלאי נמוך** - 1-2 לוחות
- **אזל מהמלאי** - 0 לוחות
