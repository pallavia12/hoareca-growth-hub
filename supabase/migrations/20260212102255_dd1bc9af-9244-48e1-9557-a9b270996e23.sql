
-- Add new contact/social fields to leads table for Step 2 Create Lead dialog
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS swiggy_zomato_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS others_info text;
