ALTER TABLE workspaces ADD COLUMN kind text NOT NULL DEFAULT 'personal'
 CHECK(kind IN ('personal','team'));
-- Only the explicitly configured pilot is a team. Do not move existing data.
UPDATE workspaces SET kind='team' WHERE id='e9a7c001-67bd-4be9-968d-13e465cd1210';
