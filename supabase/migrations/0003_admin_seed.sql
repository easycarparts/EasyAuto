-- Add easycarpartsteam@gmail.com as a second site admin (alongside hello@sgservices.ae).
-- Idempotent: updates the signup trigger AND flips the flag if the account already exists.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    lower(new.email) in ('hello@sgservices.ae', 'easycarpartsteam@gmail.com')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- If they've already signed up, grant admin now.
update public.profiles
set is_admin = true
where lower(email) = 'easycarpartsteam@gmail.com';
