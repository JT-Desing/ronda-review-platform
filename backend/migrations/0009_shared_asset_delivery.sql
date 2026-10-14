ALTER TABLE shared_assets ADD COLUMN deleted_at timestamptz;
ALTER TABLE shared_assets ADD COLUMN sort_order integer NOT NULL DEFAULT 2147483647;
CREATE INDEX shared_assets_delivery ON shared_assets(workspace_id,project_id,sort_order,created_at) WHERE deleted_at IS NULL;
