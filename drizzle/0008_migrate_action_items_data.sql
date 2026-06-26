INSERT INTO action_items (
  id, organization_id, description, assignee_id, due_date, done,
  meeting_id, deal_id, inquiry_id, created_by_id, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  m.organization_id,
  CASE
    WHEN (item->>'assignee') IS NOT NULL AND (item->>'assignee') <> ''
    THEN '[担当: ' || (item->>'assignee') || '] ' || (item->>'description')
    ELSE (item->>'description')
  END,
  NULL,  -- assignee_id: 名前文字列からは解決できない
  CASE
    WHEN (item->>'dueDate') IS NOT NULL AND (item->>'dueDate') <> ''
    THEN (item->>'dueDate')::timestamptz
    ELSE NULL
  END,
  COALESCE((item->>'done')::boolean, false),
  m.id,
  m.deal_id,
  m.inquiry_id,
  m.created_by_id,
  m.created_at,
  m.created_at
FROM meetings m,
     jsonb_array_elements(m.action_items) AS item
WHERE jsonb_typeof(m.action_items) = 'array'
  AND jsonb_array_length(m.action_items) > 0
  AND m.created_by_id IS NOT NULL;
