ALTER TABLE shared_projects ADD COLUMN deleted_at timestamptz;
CREATE INDEX shared_projects_active ON shared_projects(workspace_id,created_at) WHERE deleted_at IS NULL;
