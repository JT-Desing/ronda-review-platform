-- Per-member read state for shared project and upload activity notifications.
CREATE TABLE workspace_event_recipients (
  event_id uuid NOT NULL REFERENCES workspace_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX workspace_event_recipients_user_idx ON workspace_event_recipients(user_id, event_id);

CREATE TABLE workspace_event_reads (
  event_id uuid NOT NULL REFERENCES workspace_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX workspace_event_reads_user_read_idx ON workspace_event_reads(user_id, read_at);
