-- Allow any Mam (teacher) user to view, edit, publish, and delete all lab experiments regardless of created_by

drop policy if exists lab_update_owner on public.lab_experiments;
create policy lab_update_owner on public.lab_experiments
  for update using (public.is_mam()) with check (public.is_mam());

drop policy if exists lab_delete_owner on public.lab_experiments;
create policy lab_delete_owner on public.lab_experiments
  for delete using (public.is_mam());

-- Force PostgREST schema cache reload
notify pgrst, 'reload schema';
