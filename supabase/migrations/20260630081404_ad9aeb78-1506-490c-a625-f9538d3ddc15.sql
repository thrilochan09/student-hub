-- Revoke any write privileges from client roles on user_roles
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Explicit deny policies for client write operations (defense in depth)
DROP POLICY IF EXISTS "No client inserts on user_roles" ON public.user_roles;
CREATE POLICY "No client inserts on user_roles" ON public.user_roles
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates on user_roles" ON public.user_roles;
CREATE POLICY "No client updates on user_roles" ON public.user_roles
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on user_roles" ON public.user_roles;
CREATE POLICY "No client deletes on user_roles" ON public.user_roles
  FOR DELETE TO authenticated, anon USING (false);