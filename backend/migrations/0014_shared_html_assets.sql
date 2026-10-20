-- HTML is a distinct, sandboxed static review surface; it is never served executable.
ALTER TABLE shared_assets DROP CONSTRAINT shared_assets_kind_check;
ALTER TABLE shared_assets ADD CONSTRAINT shared_assets_kind_check CHECK(kind IN ('image','video','web','pdf','file','html'));
ALTER TABLE shared_media_files DROP CONSTRAINT shared_media_files_kind_check;
ALTER TABLE shared_media_files ADD CONSTRAINT shared_media_files_kind_check CHECK(kind IN ('image','video','pdf','file','html'));
