-- Check for existing duplicate usernames before applying this migration.
-- The unique index makes concurrent signup/username edits safe.
create unique index if not exists profiles_username_unique_lower
on public.profiles (lower(username))
where username is not null;
