-- Trigger function to automatically log event status changes
CREATE OR REPLACE FUNCTION log_event_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO event_status_log (event_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.created_by);
    -- Note: Using created_by as fallback since we don't track updated_by separately
    -- In application layer, this will be overridden by explicit status update mutation
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on events table
DROP TRIGGER IF EXISTS event_status_change_trigger ON events;
CREATE TRIGGER event_status_change_trigger
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION log_event_status_change();

-- Create archived_events view for analytics
CREATE OR REPLACE VIEW archived_events AS
SELECT
  e.*,
  c.company_name,
  c.contact_name,
  u.name AS archived_by_name
FROM events e
JOIN clients c ON e.client_id = c.id
LEFT JOIN users u ON e.archived_by = u.id
WHERE e.is_archived = true;
