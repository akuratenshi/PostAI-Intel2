-- Execute AFTER new authenticated backend is deployed and tested using the server key.
-- Applies to REST access. Server service_role remains privileged; it MUST enforce ownership.
begin;
alter table public.scheduled_posts enable row level security;
alter table public.user_channels enable row level security;
revoke all privileges on table public.scheduled_posts from anon, authenticated;
revoke all privileges on table public.user_channels from anon, authenticated;
do $$ declare r record; begin
 for r in select schemaname,tablename,policyname from pg_policies
 where schemaname='public' and tablename in ('scheduled_posts','user_channels')
 loop execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop;
end $$;
grant select,insert,update,delete on public.scheduled_posts to service_role;
grant select,insert,update,delete on public.user_channels to service_role;
commit;
