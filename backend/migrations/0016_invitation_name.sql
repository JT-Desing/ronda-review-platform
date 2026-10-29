-- A name filled by the admin makes the invitation a one-click entry for a new account.
ALTER TABLE workspace_invitations ADD COLUMN invitee_name text CHECK(char_length(invitee_name) BETWEEN 1 AND 100);
