
-- Allow authenticated users to insert their own role (needed for signup)
CREATE POLICY "Users can insert own role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage (needed for seeding via edge function)
CREATE POLICY "Service role full access" ON public.user_roles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
