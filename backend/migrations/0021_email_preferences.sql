-- Which notification emails a person wants: every digest, only mentions, or none.
ALTER TABLE users ADD COLUMN email_notifications text NOT NULL DEFAULT 'all' CHECK(email_notifications IN ('all','mentions','none'));
