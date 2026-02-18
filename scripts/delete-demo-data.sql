-- Run this in Supabase Dashboard → SQL Editor
-- Deletes: agreements, sample_orders, leads, prospects (in FK order)

DELETE FROM public.agreements;
DELETE FROM public.sample_orders;
DELETE FROM public.leads;
DELETE FROM public.prospects;
