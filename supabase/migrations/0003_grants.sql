-- ============================================================================
-- Explicit table/sequence privileges for the client roles. RLS is the row-level
-- security boundary, but the roles still need table-level GRANTs to reach the
-- tables at all. (Supabase usually configures these via default privileges;
-- this makes it explicit and reproducible.) Idempotent.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon, authenticated;

-- mam_invite_codes has RLS enabled with NO policies => deny-all to clients even
-- with the grant above; only redeem_mam_invite() (SECURITY DEFINER) touches it.
