ALTER TABLE public.outings
  DROP CONSTRAINT check_description_length,
  ADD CONSTRAINT check_description_length
    CHECK (description IS NULL OR char_length(description) <= 1000);
