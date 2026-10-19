# LostBinder Supabase authentication rollout

## 1. Inspect before migrating
Run in Supabase SQL Editor:
```sql
select table_name, column_name, data_type from information_schema.columns
where table_schema='public' and (column_name in ('user_id','recipient_id','sender_id','username') or table_name='profiles')
order by table_name,column_name;

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies where schemaname='public' order by tablename,policyname;

select username,count(*) from public.profiles where username is not null
group by username having count(*)>1;
select lower(username),count(*) from public.profiles where username is not null
group by lower(username) having count(*)>1;

select conrelid::regclass as child_table, confrelid::regclass as parent_table,
       conname, confdeltype
from pg_constraint where contype='f' and confrelid in ('auth.users'::regclass,'public.profiles'::regclass);
```
Review the results for conflicting policies, duplicate names, and non-cascading references before executing migration `20261019_auth_security.sql`.

## 2. Auth URL configuration
Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://thelostbinder.com`
- Add redirect URLs: `https://thelostbinder.com/auth/confirm`, `https://thelostbinder.com/auth/reset-password` and development equivalents.
- In Vercel, set `NEXT_PUBLIC_SITE_URL=https://thelostbinder.com` (without trailing slash).

## 3. Recovery email template
Authentication → Email Templates → Reset Password.
Use a confirmation URL matching the token-hash verification route:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password">Reset password</a>
```
Check that the Site URL matches the environment where the email was requested. This template points to production; use a development project or adjust the template for local testing.

## 4. Email confirmation
Authentication → Providers → Email: enable Confirm email.
In the Confirm Signup template, use:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm email</a>
```
The app's `/auth/confirm` route handles token hashes.

## 5. Security
- Configure CAPTCHA / bot protection and review Auth rate limits in Supabase Dashboard.
- Use Supabase's leaked-password protection where available.
- Keep the service-role/secret key exclusively server-side.
- Check RLS on every user-owned table; do not assume enabling RLS on profiles secures other tables.
- Never create a client-side API that accepts an arbitrary user ID for deletion.

## 6. Account deletion
Account deletion remains disabled in the UI. Before enabling:
- Inventory foreign keys and storage objects owned by users.
- Confirm delete cascades or implement safe cleanup.
- Require recent reauthentication and a CSRF-resistant authenticated POST.
- Use an isolated server-only admin client to call `auth.admin.deleteUser(user.id)` for the currently authenticated user only.
- Decide whether public content is deleted or anonymized and verify the policy.
- Test on disposable accounts, including friends, shares, favorites, binders, and avatars.

## 7. End-to-end tests
Test signup → confirm → login → reset email → reset password → login with new password → username edit → public profile → signout. Test duplicate usernames and expired tokens. Do not merge until production build and tests pass.
