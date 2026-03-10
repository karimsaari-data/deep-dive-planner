-- Add security_docs_url column to club_members_directory for encadrants
ALTER TABLE club_members_directory
  ADD COLUMN IF NOT EXISTS security_docs_url TEXT;
