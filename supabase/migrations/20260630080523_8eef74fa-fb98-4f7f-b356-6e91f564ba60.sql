
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Storage policies for resources bucket
CREATE POLICY "Public read resources" ON storage.objects FOR SELECT USING (bucket_id = 'resources');
CREATE POLICY "Admins upload resources" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update resources" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete resources" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND public.has_role(auth.uid(),'admin'));
