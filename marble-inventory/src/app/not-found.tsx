import { LinkButton } from "@/components/ui/Button";
import { Gem } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-chrome-100 to-chrome-300 shadow-md">
        <Gem className="text-chrome-800" size={26} />
      </div>
      <h1 className="text-3xl font-bold text-chrome-900">404</h1>
      <p className="text-sm text-muted">העמוד המבוקש לא נמצא</p>
      <LinkButton href="/dashboard" variant="primary">
        חזרה ללוח הבקרה
      </LinkButton>
    </div>
  );
}
