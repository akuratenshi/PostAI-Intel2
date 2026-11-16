-- TEMPLATE ONLY: manually verify each email and Clerk user ID in the SAME Clerk instance.
-- Replace placeholders, review row counts and execute explicitly. Never auto-claim by email.
begin;
update public.user_channels set user_id = 'REPLACE_WITH_CLERK_USER_ID'
where lower(trim(user_email)) = 'REPLACE_WITH_VERIFIED_EMAIL' and user_id is null;
update public.scheduled_posts set user_id = 'REPLACE_WITH_CLERK_USER_ID'
where lower(trim(user_email)) = 'REPLACE_WITH_VERIFIED_EMAIL' and user_id is null;
commit;
-- verified_at intentionally remains NULL. Each channel must pass the description challenge.
-- Never mark a channel verified just because an email matches.
