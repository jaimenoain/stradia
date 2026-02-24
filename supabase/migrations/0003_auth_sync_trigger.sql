-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User" (
    id,
    email,
    tenant_id,
    role,
    password_hash,
    language_preference,
    last_login_at
  )
  values (
    new.id,
    new.email,
    (new.raw_app_meta_data->>'tenant_id')::text,
    (new.raw_app_meta_data->>'role')::"UserRole",
    new.encrypted_password,
    'en',
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to call the function on user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
