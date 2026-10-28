-- Additive review entities; private snapshots/files remain untouched.
ALTER TABLE shared_projects ADD CONSTRAINT shared_projects_scope UNIQUE(workspace_id,id);
CREATE TABLE shared_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, project_id uuid NOT NULL,
 name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 255), kind text NOT NULL CHECK(kind IN ('image','video')),
 created_by uuid REFERENCES users(id), request_id uuid NOT NULL, active_version_id uuid,
 revision integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,project_id,id), UNIQUE(workspace_id,created_by,request_id),
 FOREIGN KEY(workspace_id,project_id) REFERENCES shared_projects(workspace_id,id)
);
CREATE TABLE shared_media_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, project_id uuid NOT NULL,
 asset_id uuid, created_by uuid NOT NULL REFERENCES users(id), request_id uuid NOT NULL,
 name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 255), mime text NOT NULL,
 size bigint NOT NULL CHECK(size BETWEEN 1 AND 104857600),
 kind text NOT NULL CHECK(kind IN ('image','video')),
 provider text NOT NULL DEFAULT 'local' CHECK(provider='local'), object_key text,
 state text NOT NULL DEFAULT 'staging' CHECK(state IN ('staging','received','ready','failed')),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,project_id,id), UNIQUE(workspace_id,created_by,request_id),
 FOREIGN KEY(workspace_id,project_id) REFERENCES shared_projects(workspace_id,id),
 FOREIGN KEY(workspace_id,project_id,asset_id) REFERENCES shared_assets(workspace_id,project_id,id)
);
CREATE TABLE shared_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, project_id uuid NOT NULL,
 asset_id uuid NOT NULL, file_id uuid NOT NULL UNIQUE, number integer NOT NULL CHECK(number>0),
 status text NOT NULL DEFAULT 'reviewing' CHECK(status IN ('reviewing','approved')),
 revision integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(asset_id,number), UNIQUE(workspace_id,project_id,asset_id,id),
 FOREIGN KEY(workspace_id,project_id,asset_id) REFERENCES shared_assets(workspace_id,project_id,id),
 FOREIGN KEY(workspace_id,project_id,file_id) REFERENCES shared_media_files(workspace_id,project_id,id)
);
ALTER TABLE shared_assets ADD CONSTRAINT shared_assets_active_version FOREIGN KEY(workspace_id,project_id,id,active_version_id)
 REFERENCES shared_versions(workspace_id,project_id,asset_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE shared_version_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, project_id uuid NOT NULL,
 asset_id uuid NOT NULL, version_id uuid NOT NULL, author_id uuid NOT NULL REFERENCES users(id),
 text text NOT NULL CHECK(char_length(text) BETWEEN 1 AND 2000),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','blocking')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
 anchor jsonb NOT NULL DEFAULT '{"timeSeconds":null}', annotation jsonb,
 request_id uuid NOT NULL, revision integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(version_id,author_id,request_id), UNIQUE(version_id,id),
 FOREIGN KEY(workspace_id,project_id,asset_id,version_id) REFERENCES shared_versions(workspace_id,project_id,asset_id,id)
);
CREATE INDEX ON shared_version_comments(version_id,created_at,id);
CREATE TABLE shared_comment_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL, comment_id uuid NOT NULL,
 author_id uuid NOT NULL REFERENCES users(id), text text NOT NULL CHECK(char_length(text) BETWEEN 1 AND 2000),
 request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(comment_id,author_id,request_id),
 FOREIGN KEY(version_id,comment_id) REFERENCES shared_version_comments(version_id,id)
);
CREATE TABLE shared_review_decisions (
 version_id uuid NOT NULL REFERENCES shared_versions(id), user_id uuid NOT NULL REFERENCES users(id),
 decision text NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','approved','changes_requested')),
 request_id uuid, active boolean NOT NULL DEFAULT true, decided_at timestamptz,
 PRIMARY KEY(version_id,user_id)
);
CREATE INDEX ON shared_media_files(workspace_id,state,expires_at);
