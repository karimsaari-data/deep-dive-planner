-- Create a table to store historical outing participants
-- These participants are linked to club_members_directory, not to app profiles
CREATE TABLE public.historical_outing_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.club_members_directory(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(outing_id, member_id)
);

-- Enable RLS
ALTER TABLE public.historical_outing_participants ENABLE ROW LEVEL SECURITY;

-- Admins and organizers can manage historical participants
CREATE POLICY "Admins and organizers can manage historical participants"
ON public.historical_outing_participants
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'organizer'));

-- Anyone can view historical participants
CREATE POLICY "Anyone can view historical participants"
ON public.historical_outing_participants
FOR SELECT
USING (true);

-- Add index for better query performance
CREATE INDEX idx_historical_participants_outing ON public.historical_outing_participants(outing_id);
CREATE INDEX idx_historical_participants_member ON public.historical_outing_participants(member_id);