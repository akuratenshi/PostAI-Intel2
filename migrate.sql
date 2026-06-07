-- Добавляем недостающие поля к существующей таблице
-- Выполните в Supabase → SQL Editor → Run

alter table scheduled_posts
  add column if not exists niche      text,
  add column if not exists topic      text,
  add column if not exists format     text default 'news',
  add column if not exists competitor text;

-- Меняем post_text на nullable (чтобы можно было генерировать через PostAI)
alter table scheduled_posts
  alter column post_text drop not null;

-- Индекс для быстрого поиска pending постов
create index if not exists idx_scheduled_posts_pending
  on scheduled_posts (status, scheduled_at)
  where status = 'pending';

-- Индекс для поиска по email
create index if not exists idx_scheduled_posts_email
  on scheduled_posts (user_email);

-- Проверяем результат — должны увидеть все колонки
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'scheduled_posts'
order by ordinal_position;
