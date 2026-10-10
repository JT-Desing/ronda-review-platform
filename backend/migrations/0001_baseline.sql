-- Forward-only baseline: adopts the existing prototype without deleting data.
-- Rollback is application rollback; never drop populated tables.
CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, name text NOT NULL, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_attempts (key text PRIMARY KEY, attempts integer NOT NULL, window_start timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS workspaces (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS workspace_members (workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, role text NOT NULL CHECK(role IN ('admin','editor','reviewer')), PRIMARY KEY(workspace_id,user_id));
 CREATE TABLE IF NOT EXISTS account_data (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, revision integer NOT NULL DEFAULT 0, data jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS files (id uuid NOT NULL, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, name text NOT NULL, mime text NOT NULL, size bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id,user_id));
 ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text UNIQUE;
 CREATE TABLE IF NOT EXISTS oauth_states(token_hash text PRIMARY KEY, nonce text NOT NULL, verifier text NOT NULL, expires_at timestamptz NOT NULL);
