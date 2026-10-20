-- Existing projects retain team visibility; selected membership is opt-in.
ALTER TABLE shared_projects ADD COLUMN restricted boolean NOT NULL DEFAULT false;
CREATE TABLE shared_project_members (
 workspace_id uuid NOT NULL,
 project_id uuid NOT NULL,
 user_id uuid NOT NULL,
 role text NOT NULL CHECK(role IN ('editor','reviewer')),
 PRIMARY KEY(workspace_id,project_id,user_id),
 FOREIGN KEY(workspace_id,project_id) REFERENCES shared_projects(workspace_id,id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,user_id) REFERENCES workspace_members(workspace_id,user_id) ON DELETE CASCADE
);
CREATE INDEX ON shared_project_members(user_id,workspace_id);
