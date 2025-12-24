-- Create storage bucket for outing gallery photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('outings_gallery', 'outings_gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for outings_gallery
CREATE POLICY "Anyone can view outing photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'outings_gallery');

CREATE POLICY "Organizers can upload outing photos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'outings_gallery' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'organizer')
  )
);

CREATE POLICY "Organizers can delete outing photos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'outings_gallery' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'organizer')
  )
);

-- Add photos column to outings table
ALTER TABLE public.outings 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Create a view for outings that hides session_report for regular members
-- We'll handle this in the application layer with RLS since views are complex
-- Instead, we'll rely on client-side filtering based on user role

-- Create function to check if user is encadrant (Encadrant member_status OR organizer/admin role)
CREATE OR REPLACE FUNCTION public.is_encadrant_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND member_status = 'Encadrant'
  )
  OR public.has_role(_user_id, 'admin')
  OR public.has_role(_user_id, 'organizer')
$$;