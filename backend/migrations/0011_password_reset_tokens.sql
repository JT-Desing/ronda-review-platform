CREATE TABLE password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX password_reset_tokens_user ON password_reset_tokens(user_id, created_at DESC);
CREATE INDEX password_reset_tokens_expiry ON password_reset_tokens(expires_at);
CREATE INDEX password_reset_tokens_used ON password_reset_tokens(used_at) WHERE used_at IS NOT NULL;
