export const APP_NAME = "ניהול מלאי שיש";

export const NAV_LINKS = [
  { href: "/dashboard", label: "לוח בקרה", icon: "LayoutDashboard" },
  { href: "/inventory", label: "מלאי", icon: "Boxes" },
  { href: "/sales", label: "מכירות", icon: "Receipt" },
  { href: "/gallery", label: "גלריה", icon: "Image" },
  { href: "/reports", label: "דוחות", icon: "BarChart3" },
  { href: "/settings", label: "הגדרות", icon: "Settings" },
] as const;

export const MARBLE_CATEGORIES = [
  "שיש",
  "גרניט",
  "קוורץ",
  "טרוונטין",
  "אבן טבעית",
  "אבן קיסר",
  "אחר",
] as const;

export const MARBLE_COLORS = [
  "לבן",
  "שחור",
  "בז'",
  "אפור",
  "קרם",
  "חום",
  "ירוק",
  "כחול",
  "זהב",
  "מולטי-קולור",
] as const;

export const THICKNESS_OPTIONS = ["1.2 ס\"מ", "2 ס\"מ", "3 ס\"מ", "5 ס\"מ", "אחר"] as const;

export const LOCATIONS = [
  "מחסן ראשי",
  "אולם תצוגה",
  "מחסן חיצוני",
  "משטח חיתוך",
  "מיקום אחר",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  in_stock: "במלאי",
  low_stock: "מלאי נמוך",
  out_of_stock: "אזל מהמלאי",
};

export const STATUS_COLORS: Record<string, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  low_stock: "bg-amber-50 text-amber-700 ring-amber-600/20",
  out_of_stock: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export const MOVEMENT_LABELS: Record<string, string> = {
  add: "הוספת מלאי",
  remove: "הפחתת מלאי",
  sell: "מכירה",
  manual: "עדכון ידני",
  create: "יצירת פריט",
};
