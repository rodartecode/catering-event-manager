-- name: GetResourceByID :one
SELECT id, name, type, hourly_rate, is_available, notes, created_at, updated_at
FROM resources
WHERE id = $1;

-- name: ListResources :many
SELECT id, name, type, hourly_rate, is_available, notes, created_at, updated_at
FROM resources
WHERE (sqlc.narg('type')::resource_type IS NULL OR type = sqlc.narg('type')::resource_type)
  AND (sqlc.narg('is_available')::boolean IS NULL OR is_available = sqlc.narg('is_available')::boolean)
ORDER BY name
LIMIT sqlc.arg('limit_count')
OFFSET sqlc.arg('offset_count');

-- name: GetResourceSchedule :many
SELECT
    rs.id,
    rs.resource_id,
    rs.event_id,
    e.event_name,
    rs.task_id,
    t.title as task_title,
    rs.start_time,
    rs.end_time,
    rs.notes,
    rs.created_at,
    rs.updated_at
FROM resource_schedule rs
JOIN events e ON rs.event_id = e.id
LEFT JOIN tasks t ON rs.task_id = t.id
WHERE rs.resource_id = $1
  AND rs.start_time >= $2
  AND rs.end_time <= $3
ORDER BY rs.start_time;

-- name: CheckConflicts :many
-- Find all existing schedule entries that overlap with the requested time range
-- for any of the specified resources
SELECT
    rs.id,
    rs.resource_id,
    r.name as resource_name,
    rs.event_id,
    e.event_name,
    rs.task_id,
    t.title as task_title,
    rs.start_time as existing_start_time,
    rs.end_time as existing_end_time
FROM resource_schedule rs
JOIN resources r ON rs.resource_id = r.id
JOIN events e ON rs.event_id = e.id
LEFT JOIN tasks t ON rs.task_id = t.id
WHERE rs.resource_id = ANY($1::int[])
  AND tstzrange(rs.start_time, rs.end_time, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
  AND (sqlc.narg('exclude_schedule_id')::int IS NULL OR rs.id != sqlc.narg('exclude_schedule_id')::int)
ORDER BY rs.resource_id, rs.start_time;

-- name: CreateScheduleEntry :one
INSERT INTO resource_schedule (resource_id, event_id, task_id, start_time, end_time, notes)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, resource_id, event_id, task_id, start_time, end_time, notes, created_at, updated_at;

-- name: DeleteScheduleEntry :exec
DELETE FROM resource_schedule
WHERE id = $1;

-- name: DeleteScheduleEntriesByTask :exec
DELETE FROM resource_schedule
WHERE task_id = $1;

-- name: GetScheduleEntryByID :one
SELECT
    rs.id,
    rs.resource_id,
    rs.event_id,
    e.event_name,
    rs.task_id,
    t.title as task_title,
    rs.start_time,
    rs.end_time,
    rs.notes,
    rs.created_at,
    rs.updated_at
FROM resource_schedule rs
JOIN events e ON rs.event_id = e.id
LEFT JOIN tasks t ON rs.task_id = t.id
WHERE rs.id = $1;
