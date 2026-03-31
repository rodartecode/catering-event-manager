-- Enable RLS on notification tables from migration 0009
-- Matches test helper (apps/web/test/helpers/db.ts rlsTables array)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
