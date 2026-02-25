
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS pan_card_url text,
  ADD COLUMN IF NOT EXISTS gst_cert_url text,
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS verification_note text;
