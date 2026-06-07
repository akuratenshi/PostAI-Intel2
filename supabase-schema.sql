-- Полная таблица для PostAI автопостинга
-- Выполните в Supabase → SQL Editor → Run

create table if not exists scheduled_posts (
  id                  uuid default gen_random_uuid() primary key,
  user_email          text not null,
  channel_username    text not null,
  post_text           text,
  niche               text,
  topic               text,
  format              text default 'news',
  competitor          text,
  platform            text default 'telegram',
  scheduled_at        timestamptz not null,
  status              text default 'pending',
  published_at        timestamptz,
  telegram_message_id bigint,
  error_message       text,
  created_at          timestamptz default now()
);

-- Индекс для быстрого поиска pending постов по времени
create index if not exists idx_scheduled_posts_pending
  on scheduled_posts (status, scheduled_at)
  where status = 'pending';

-- Индекс для поиска по email пользователя
create index if not exists idx_scheduled_posts_email
  on scheduled_posts (user_email);
