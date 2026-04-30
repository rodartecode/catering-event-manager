-- Enable RLS on vendors and event_vendors tables from migration 0014
-- Matches test helper (apps/web/test/helpers/db.ts rlsTables array)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;
