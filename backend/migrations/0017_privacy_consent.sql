-- Proof of the data-processing authorization (Ley 1581 de 2012): which policy version and when.
ALTER TABLE users ADD COLUMN privacy_version text;
ALTER TABLE users ADD COLUMN privacy_accepted_at timestamptz;
