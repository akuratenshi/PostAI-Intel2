-- Run only after backup. Additive preparation; no data deletion and no policy removal.
begin;
alter table public.scheduled_posts add column if not exists user_id text;
alter table public.scheduled_posts add column if not exists language text default 'ru';
alter table public.scheduled_posts add column if not exists is_recurring boolean default false;
alter table public.scheduled_posts add column if not exists recurrence_time text;
alter table public.scheduled_posts add column if not exists recurrence_days text;
alter table public.scheduled_posts add column if not exists claim_token uuid;
alter table public.scheduled_posts add column if not exists processing_started_at timestamptz;
alter table public.user_channels add column if not exists user_id text;
alter table public.user_channels add column if not exists verified_at timestamptz;
create index if not exists scheduled_posts_owner_idx on public.scheduled_posts(user_id);
create index if not exists user_channels_owner_idx on public.user_channels(user_id,channel_username);
commit;
-- If an existing status CHECK constraint rejects processing/publishing/unknown, adapt that
-- constraint BEFORE deployment. Inspect, do not blindly drop unrelated constraints:
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.scheduled_posts'::regclass and contype = 'c';
