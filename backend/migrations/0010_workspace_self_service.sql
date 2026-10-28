ALTER TABLE workspaces ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE workspaces ADD COLUMN request_id uuid;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_creation_request UNIQUE(created_by,request_id);
