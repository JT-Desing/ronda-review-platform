-- In-app notifications per person, created in the same transaction as the team event.
-- emailed_at marks the rows already sent in a digest email.
CREATE TABLE user_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
 kind text NOT NULL CHECK(kind IN ('asset','version','comment','reply','mention','decision')),
 details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz,
 emailed_at timestamptz
);
CREATE INDEX ON user_notifications(user_id,created_at DESC);
CREATE INDEX ON user_notifications(created_at) WHERE emailed_at IS NULL;
