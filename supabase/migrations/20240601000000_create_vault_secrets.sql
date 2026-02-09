-- Enable pgsodium extension
create extension if not exists pgsodium;

-- Create vault_provider enum
do $$
begin
    if not exists (select 1 from pg_type where typname = 'vault_provider') then
        create type public.vault_provider as enum ('GTM', 'GOOGLE_ADS', 'META');
    end if;
end $$;

-- Create vault_secrets table
create table if not exists public.vault_secrets (
    id uuid not null default gen_random_uuid() primary key,
    market_id uuid not null references public.markets(id) on delete cascade,
    provider public.vault_provider not null,
    encrypted_token text not null,
    token_metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(market_id, provider)
);

-- RLS
alter table public.vault_secrets enable row level security;

-- Create key for vault if it doesn't exist
do $$
begin
    if not exists (select 1 from pgsodium.key where name = 'vault_key') then
        perform pgsodium.create_key(name := 'vault_key');
    end if;
end $$;

-- Trigger function to encrypt data
create or replace function public.encrypt_vault_secret()
returns trigger
language plpgsql
security definer
set search_path = public, pgsodium
as $$
declare
    key_id uuid;
    encrypted_data bytea;
begin
    -- Get the key
    select id into key_id from pgsodium.key where name = 'vault_key';

    if key_id is null then
        raise exception 'Vault key not found';
    end if;

    -- Encrypt the token (which is in NEW.encrypted_token temporarily as plain text)
    -- We use market_id as associated data (AD) to bind the secret to the market
    encrypted_data := pgsodium.crypto_aead_det_encrypt(
        convert_to(NEW.encrypted_token, 'utf8'), -- message
        convert_to(NEW.market_id::text, 'utf8'), -- additional data
        key_id,
        null -- context (optional)
    );

    -- Store as base64
    NEW.encrypted_token := encode(encrypted_data, 'base64');

    return NEW;
end;
$$;

-- Trigger for Insert
drop trigger if exists encrypt_vault_secret_trigger on public.vault_secrets;
create trigger encrypt_vault_secret_trigger
before insert on public.vault_secrets
for each row
execute function public.encrypt_vault_secret();

-- Trigger for Update
drop trigger if exists encrypt_vault_secret_update_trigger on public.vault_secrets;
create trigger encrypt_vault_secret_update_trigger
before update of encrypted_token on public.vault_secrets
for each row
execute function public.encrypt_vault_secret();

-- RLS Policies

-- Insert: Authenticated users can insert for their markets
create policy "Users can insert secrets for their markets"
on public.vault_secrets for insert
to authenticated
with check (
    market_id in (
        select id from public.markets
        where org_id = (select org_id from public.profiles where user_id = auth.uid())
    )
);

-- Delete: Authenticated users can delete secrets for their markets
create policy "Users can delete secrets for their markets"
on public.vault_secrets for delete
to authenticated
using (
    market_id in (
        select id from public.markets
        where org_id = (select org_id from public.profiles where user_id = auth.uid())
    )
);

-- Select: NO POLICY for authenticated users (Blind Write)
-- This enforces that `select * from vault_secrets` returns nothing for authenticated users.

-- Function to retrieve decrypted token
create or replace function public.retrieve_decrypted_secret(p_market_id uuid, p_provider public.vault_provider)
returns text
language plpgsql
security definer
set search_path = public, pgsodium
as $$
declare
    v_encrypted_token text;
    key_id uuid;
    decrypted_data bytea;
begin
    -- Get the encrypted token
    -- Security Definer bypasses RLS, so we can select.
    select encrypted_token into v_encrypted_token
    from public.vault_secrets
    where market_id = p_market_id and provider = p_provider;

    if v_encrypted_token is null then
        return null;
    end if;

    -- Get the key
    select id into key_id from pgsodium.key where name = 'vault_key';

    if key_id is null then
        raise exception 'Vault key not found';
    end if;

    -- Decrypt
    decrypted_data := pgsodium.crypto_aead_det_decrypt(
        decode(v_encrypted_token, 'base64'),
        convert_to(p_market_id::text, 'utf8'),
        key_id,
        null
    );

    return convert_from(decrypted_data, 'utf8');
end;
$$;

-- Secure the function: Revoke from PUBLIC, Grant to service_role
revoke execute on function public.retrieve_decrypted_secret(uuid, public.vault_provider) from public;
grant execute on function public.retrieve_decrypted_secret(uuid, public.vault_provider) to service_role;
