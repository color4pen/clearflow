-- interactions.attendees JSONB から isExternal=true かつ contactId が null の要素を除去する。
-- スキーマ変更なし（データのみの差分マイグレーション）。
-- 社内参加者・contactId を保持する社外参加者は変更しない。

UPDATE interactions
SET attendees = COALESCE(
  (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(attendees) AS elem
    WHERE NOT (
      (elem->>'isExternal')::boolean = true
      AND (elem->>'contactId' IS NULL OR elem->>'contactId' = 'null')
    )
  ),
  '[]'::jsonb
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(attendees) AS elem
  WHERE (elem->>'isExternal')::boolean = true
    AND (elem->>'contactId' IS NULL OR elem->>'contactId' = 'null')
);