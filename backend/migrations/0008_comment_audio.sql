CREATE TABLE shared_comment_audio (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 comment_id uuid NOT NULL REFERENCES shared_version_comments(id) ON DELETE CASCADE,
 name text NOT NULL,
 mime text NOT NULL,
 bytes bytea NOT NULL,
 digest text NOT NULL,
 ordinal integer NOT NULL,
 CHECK(octet_length(bytes) <= 2097152),
 UNIQUE(comment_id,ordinal)
);
