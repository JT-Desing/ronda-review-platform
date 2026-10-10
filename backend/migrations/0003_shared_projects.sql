-- Additive forward-only collaboration. Private snapshots/files remain untouched.
CREATE TABLE shared_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 100),
 client text NOT NULL DEFAULT '' CHECK(char_length(client)<=100),
 created_by uuid REFERENCES users(id) ON DELETE SET NULL,
 request_id uuid NOT NULL,
 revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,created_by,request_id)
);
CREATE INDEX ON shared_projects(workspace_id,created_at);
CREATE TABLE shared_project_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES shared_projects(id) ON DELETE CASCADE,
 author_id uuid REFERENCES users(id) ON DELETE SET NULL,
 text text NOT NULL CHECK(char_length(text) BETWEEN 1 AND 2000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
 request_id uuid NOT NULL,
 revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 UNIQUE(project_id,author_id,request_id)
);
CREATE INDEX ON shared_project_comments(project_id,created_at);
