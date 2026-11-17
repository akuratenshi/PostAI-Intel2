-- Run once in Supabase SQL Editor before deploying the files.
alter table public.scheduled_posts add column if not exists photo_data text;
