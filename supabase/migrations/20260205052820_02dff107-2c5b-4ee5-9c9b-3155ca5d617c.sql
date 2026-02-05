-- Add organizer_member_id column to outings table for historical outings
-- This stores the club_members_directory ID of the organizer
-- Used when the organizer doesn't have an app account (no profile)
ALTER TABLE public.outings 
ADD COLUMN organizer_member_id uuid REFERENCES public.club_members_directory(id);

-- Add comment for documentation
COMMENT ON COLUMN public.outings.organizer_member_id IS 'For historical outings: references the organizer in club_members_directory. Used when organizer has no app account (organizer_id is null).';