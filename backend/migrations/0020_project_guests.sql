-- A guest is an outside client: one project at a time, read and comment, no seat.
ALTER TABLE workspace_members DROP CONSTRAINT workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check CHECK(role IN ('admin','editor','reviewer','guest'));
ALTER TABLE workspace_invitations DROP CONSTRAINT workspace_invitations_role_check;
ALTER TABLE workspace_invitations ADD CONSTRAINT workspace_invitations_role_check CHECK(role IN ('admin','editor','reviewer','guest'));
ALTER TABLE workspace_invitations ADD COLUMN project_id uuid;
ALTER TABLE workspace_invitations ADD CONSTRAINT workspace_invitations_project_fk FOREIGN KEY(workspace_id,project_id) REFERENCES shared_projects(workspace_id,id) ON DELETE CASCADE;
ALTER TABLE workspace_invitations ADD CONSTRAINT workspace_invitations_guest_project CHECK((role='guest')=(project_id IS NOT NULL));
