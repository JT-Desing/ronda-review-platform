-- Additive, forward-only. Roll back application code, not these records.
CREATE TABLE workspace_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 email text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','editor','reviewer')),
 token_hash text UNIQUE NOT NULL,
 created_by uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 accepted_at timestamptz,
 revoked_at timestamptz
);
CREATE INDEX ON workspace_invitations(workspace_id);
CREATE TABLE workspace_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON workspace_events(workspace_id,created_at);
