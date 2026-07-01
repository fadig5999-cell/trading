-- Seed data for demo marble inventory
-- Run after schema.sql

INSERT INTO marble_types (name, hebrew_name, category, color, thickness, size, quantity, location, cost_price, selling_price, notes, image_url) VALUES
('Calacatta Gold', 'קלקטה גולד', 'שיש איטלקי', 'לבן עם עורקי זהב', '2 ס"מ', '320x160 ס"מ', 8, 'אולם תצוגה א׳', 4500.00, 7800.00, 'שיש פרימיום מאיטליה', 'https://images.unsplash.com/photo-1615971677490-4c1e2d4d8b8e?w=600&q=80'),
('Nero Marquina', 'נרו מרקינה', 'שיש איטלקי', 'שחור עם עורקים לבנים', '2 ס"מ', '300x150 ס"מ', 5, 'אולם תצוגה א׳', 3200.00, 5500.00, 'שיש שחור קלאסי', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80'),
('Emperador Dark', 'אמפרדור דארק', 'שיש ספרדי', 'חום כהה', '2 ס"מ', '310x155 ס"מ', 12, 'מחסן ראשי', 2800.00, 4800.00, 'שיש חום עשיר', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80'),
('Statuario', 'סטטואריו', 'שיש איטלקי', 'לבן טהור', '3 ס"מ', '320x160 ס"מ', 2, 'אולם תצוגה ב׳', 5500.00, 9200.00, 'מלאי נמוך - הזמנה מיוחדת', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80'),
('Travertine Classic', 'טרוורטין קלאסי', 'אבן טבעית', 'בז׳ חם', '2 ס"מ', '300x150 ס"מ', 15, 'מחסן ראשי', 1800.00, 3200.00, 'אבן טבעית פופולרית', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=600&q=80'),
('Carrara White', 'קררה לבן', 'שיש איטלקי', 'לבן עם עורקים אפורים', '2 ס"מ', '310x155 ס"מ', 0, 'אולם תצוגה א׳', 2500.00, 4200.00, 'אזל מהמלאי', 'https://images.unsplash.com/photo-1600210492496-094e691a3ead?w=600&q=80'),
('Verde Guatemala', 'ורדה גואטמלה', 'גרניט', 'ירוק כהה', '3 ס"מ', '300x150 ס"מ', 6, 'מחסן ראשי', 3500.00, 5800.00, 'גרניט ירוק יוקרתי', 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=600&q=80'),
('Crema Marfil', 'קרמה מרפיל', 'שיש ספרדי', 'קרם בהיר', '2 ס"מ', '320x160 ס"מ', 9, 'אולם תצוגה ב׳', 2200.00, 3900.00, 'שיש קרם אלגנטי', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80');
