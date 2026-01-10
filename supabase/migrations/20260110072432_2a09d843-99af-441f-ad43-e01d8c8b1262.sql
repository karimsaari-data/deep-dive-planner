-- Add board_role column for bureau members
ALTER TABLE public.club_members_directory
ADD COLUMN board_role TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.club_members_directory.board_role IS 'Role in the club bureau: Président, Vice-Président, Trésorier, Secrétaire, etc.';