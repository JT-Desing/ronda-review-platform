-- Transactional outbox. Every row written to workspace_events is copied here by a
-- trigger inside the same transaction, so a future consumer (another service, a
-- queue) can read domain events without touching the code that produces them.
-- No foreign keys on purpose: deleting a workspace must not erase events that a
-- consumer has not read yet. Rows are transport, not archive: maintenance purges
-- them after 30 days (see maintenance.js).
CREATE TABLE event_outbox (
 seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id uuid NOT NULL UNIQUE,
 event_type text NOT NULL,
 event_version integer NOT NULL DEFAULT 1 CHECK(event_version > 0),
 aggregate_type text NOT NULL CHECK(aggregate_type IN ('workspace','project')),
 aggregate_id uuid NOT NULL,
 workspace_id uuid NOT NULL,
 actor_id uuid,
 payload jsonb NOT NULL DEFAULT '{}',
 occurred_at timestamptz NOT NULL,
 available_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 published_at timestamptz
);
CREATE INDEX event_outbox_pending ON event_outbox(available_at, seq) WHERE published_at IS NULL;
CREATE INDEX event_outbox_occurred ON event_outbox(occurred_at);
CREATE INDEX event_outbox_actor ON event_outbox(actor_id) WHERE actor_id IS NOT NULL;

CREATE FUNCTION workspace_event_to_outbox() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 project text := NEW.details->>'projectId';
 is_project boolean := project ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
 INSERT INTO event_outbox(event_id,event_type,aggregate_type,aggregate_id,workspace_id,actor_id,payload,occurred_at)
 VALUES(NEW.id,NEW.action,
  CASE WHEN is_project THEN 'project' ELSE 'workspace' END,
  CASE WHEN is_project THEN project::uuid ELSE NEW.workspace_id END,
  NEW.workspace_id,NEW.actor_id,NEW.details,NEW.created_at);
 RETURN NEW;
END $$;

CREATE TRIGGER workspace_events_outbox AFTER INSERT ON workspace_events
 FOR EACH ROW EXECUTE FUNCTION workspace_event_to_outbox();
