-- 1. Encryption at Rest
-- Insert a secret (this would normally be done by the application via the trigger)
-- We simulate it here. Note: In a real SQL session, we can't easily set 'authenticated' role and 'auth.uid()'
-- without specific setup, but this demonstrates the logic.

-- As a service role or superuser, we can verify encryption.
-- Assume a secret was inserted with value 'my_secret_key_123'.
-- SELECT encrypted_token FROM vault_secrets WHERE market_id = '...' AND provider = 'GTM';
-- Expected Result: A base64 string, NOT 'my_secret_key_123'.

-- 2. Least Privilege (Blind Write)
-- As an authenticated user (simulated):
-- SET ROLE authenticated;
-- SELECT * FROM vault_secrets;
-- Expected Result: 0 rows (due to RLS policy).

-- 3. Function Security
-- As an authenticated user:
-- SELECT retrieve_decrypted_secret('...', 'GTM');
-- Expected Result: ERROR: permission denied for function retrieve_decrypted_secret

-- 4. Secure Retrieval
-- As service_role (or superuser):
-- SET ROLE service_role;
-- SELECT retrieve_decrypted_secret('...', 'GTM');
-- Expected Result: 'my_secret_key_123'
