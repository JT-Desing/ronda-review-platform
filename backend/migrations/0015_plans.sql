-- Plans live on the account (personal space) and on each team space.
-- Limits come from backend/plans.js; the database only stores the choice.
ALTER TABLE users ADD COLUMN plan text NOT NULL DEFAULT 'gratis' CHECK(plan IN ('gratis','creador'));
ALTER TABLE users ADD COLUMN plan_status text NOT NULL DEFAULT 'active' CHECK(plan_status IN ('active','pending','suspended'));
ALTER TABLE users ADD COLUMN extra_storage_packs integer NOT NULL DEFAULT 0 CHECK(extra_storage_packs BETWEEN 0 AND 100);

ALTER TABLE workspaces ADD COLUMN plan text CHECK(plan IN ('estudio','agencia','a-medida'));
ALTER TABLE workspaces ADD COLUMN plan_status text NOT NULL DEFAULT 'pending' CHECK(plan_status IN ('active','pending','suspended'));
ALTER TABLE workspaces ADD COLUMN extra_storage_packs integer NOT NULL DEFAULT 0 CHECK(extra_storage_packs BETWEEN 0 AND 100);
ALTER TABLE workspaces ADD COLUMN custom_members integer CHECK(custom_members BETWEEN 1 AND 10000);
ALTER TABLE workspaces ADD COLUMN custom_storage_gb integer CHECK(custom_storage_gb BETWEEN 1 AND 1048576);

-- Teams created before plans existed (the ePayco pilot) keep working on Agencia.
UPDATE workspaces SET plan='agencia', plan_status='active' WHERE kind='team';
ALTER TABLE workspaces ADD CONSTRAINT workspaces_team_plan CHECK(kind<>'team' OR plan IS NOT NULL);
