-- Let shared projects store source and office documents without executing them.
ALTER TABLE shared_assets DROP CONSTRAINT shared_assets_kind_check;
ALTER TABLE shared_assets ADD CONSTRAINT shared_assets_kind_check CHECK(kind IN ('image','video','web','pdf','file'));
ALTER TABLE shared_media_files DROP CONSTRAINT shared_media_files_kind_check;
ALTER TABLE shared_media_files ADD CONSTRAINT shared_media_files_kind_check CHECK(kind IN ('image','video','pdf','file'));
