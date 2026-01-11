-- Add is_encadrant column to club_members_directory
ALTER TABLE public.club_members_directory
ADD COLUMN is_encadrant BOOLEAN NOT NULL DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.club_members_directory.is_encadrant IS 'Indicates if the member is a staff/encadrant (source of truth for this status)';