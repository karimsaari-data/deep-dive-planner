-- Optional cover image for an outing. When set, it is displayed instead of the
-- location photo on the outing card / detail view. Kept separate from the
-- `photos` array (which is the post-event souvenir gallery) so the two don't mix.
ALTER TABLE public.outings ADD COLUMN IF NOT EXISTS cover_image_url text;
