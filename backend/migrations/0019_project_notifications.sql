-- New kind: a project was created in the team.
ALTER TABLE user_notifications DROP CONSTRAINT user_notifications_kind_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_kind_check CHECK(kind IN ('asset','version','comment','reply','mention','decision','project'));
