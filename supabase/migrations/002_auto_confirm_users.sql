-- ============================================================
-- Auto-confirm all users so they can sign in immediately
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Confirm any existing users that are unconfirmed
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- 2. Create function to automatically confirm all new users on signup
create or replace function public.auto_confirm_new_users()
returns trigger
language plpgsql
security definer
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

-- 3. Attach trigger to auth.users before insert
drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_new_users();
