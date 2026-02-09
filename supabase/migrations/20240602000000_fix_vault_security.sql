-- Fix security for retrieve_decrypted_secret
-- Explicitly revoke from all public roles
revoke execute on function public.retrieve_decrypted_secret(uuid, public.vault_provider) from public;
revoke execute on function public.retrieve_decrypted_secret(uuid, public.vault_provider) from anon;
revoke execute on function public.retrieve_decrypted_secret(uuid, public.vault_provider) from authenticated;

-- Grant only to service_role
grant execute on function public.retrieve_decrypted_secret(uuid, public.vault_provider) to service_role;
