import { LoginForm } from "@/components/auth/LoginForm";
import { Gem } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-chrome-900 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(166,138,82,0.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08), transparent 40%)",
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-chrome-100 to-chrome-300 shadow-lg ring-1 ring-white/20">
            <Gem className="text-chrome-800" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ניהול מלאי שיש
          </h1>
          <p className="mt-1.5 text-sm text-chrome-400">
            מערכת ניהול מלאי מקצועית לאולם תצוגה של שיש ואבן טבעית
          </p>
        </div>

        <div className="luxury-card p-6 sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-chrome-900">
            כניסה למערכת
          </h2>
          <p className="mb-6 text-sm text-muted">
            הכניסה מוגבלת לבעלי הרשאה בלבד. פנה למנהל המערכת לקבלת פרטי גישה.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-chrome-500">
          © {new Date().getFullYear()} כל הזכויות שמורות — נבנה בישראל 🇮🇱
        </p>
      </div>
    </div>
  );
}
