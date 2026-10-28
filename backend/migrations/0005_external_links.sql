ALTER TABLE shared_assets DROP CONSTRAINT shared_assets_kind_check;
ALTER TABLE shared_assets ADD CONSTRAINT shared_assets_kind_check CHECK(kind IN ('image','video','web'));
ALTER TABLE shared_versions ALTER COLUMN file_id DROP NOT NULL;
ALTER TABLE shared_versions ADD COLUMN external_url text;
ALTER TABLE shared_versions ADD COLUMN external_mime text;
ALTER TABLE shared_versions ADD CONSTRAINT shared_versions_source CHECK (
 (file_id IS NOT NULL AND external_url IS NULL AND external_mime IS NULL) OR
 (file_id IS NULL AND external_url IS NOT NULL AND external_url LIKE 'https://%' AND char_length(external_url)<=2048 AND external_mime IS NOT NULL)
);
