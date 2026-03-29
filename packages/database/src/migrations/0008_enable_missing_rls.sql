-- Enable RLS on tables from migrations 0006 (documents) and 0007 (menus)
-- Aligns production with test helper (apps/web/test/helpers/db.ts)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menu_items ENABLE ROW LEVEL SECURITY;
