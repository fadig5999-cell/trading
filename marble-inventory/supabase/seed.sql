-- Optional demo data. Run this after 0001_init.sql if you want the app to
-- launch with a realistic-looking catalog instead of an empty one.

insert into public.marble_types
  (name, name_he, category, color, thickness, size, quantity, low_stock_threshold, location, cost_price, selling_price, notes)
values
  ('Carrara White', 'קררה לבן', 'שיש', 'לבן', '2 ס"מ', '320x160 ס"מ', 12, 3, 'אולם תצוגה', 850, 1450, 'שיש איטלקי קלאסי, גימור מלוטש'),
  ('Calacatta Gold', 'קלאקטה זהב', 'שיש', 'זהב', '3 ס"מ', '320x170 ס"מ', 4, 3, 'אולם תצוגה', 1400, 2300, 'עורקי זהב בולטים, פריט יוקרה'),
  ('Nero Marquina', 'נרו מרקינה', 'שיש', 'שחור', '2 ס"מ', '300x160 ס"מ', 2, 3, 'מחסן ראשי', 950, 1650, 'שיש שחור עם עורקים לבנים'),
  ('Emperador Dark', 'אמפרדור כהה', 'שיש', 'חום', '2 ס"מ', '300x155 ס"מ', 8, 3, 'מחסן ראשי', 700, 1200, null),
  ('Kashmir White', 'קשמיר לבן', 'גרניט', 'לבן', '3 ס"מ', '320x165 ס"מ', 0, 3, 'מחסן חיצוני', 1100, 1900, 'אזל מהמלאי - יש להזמין'),
  ('Blue Bahia', 'בלו באהיה', 'גרניט', 'כחול', '3 ס"מ', '280x160 ס"מ', 3, 2, 'אולם תצוגה', 2200, 3600, 'פריט נדיר ומיוחד'),
  ('Botticino Classico', 'בוטיצ׳ינו קלאסיקו', 'אבן טבעית', 'קרם', '2 ס"מ', '305x160 ס"מ', 15, 4, 'מחסן ראשי', 600, 980, null),
  ('Silver Travertine', 'טרוונטין כסף', 'טרוונטין', 'אפור', '2 ס"מ', '290x150 ס"מ', 6, 3, 'משטח חיתוך', 520, 890, 'מרקם טבעי עשיר');
