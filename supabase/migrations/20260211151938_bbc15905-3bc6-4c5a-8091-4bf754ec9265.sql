
-- Add tag and recall_date columns to prospects table
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS recall_date date;
