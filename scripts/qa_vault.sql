-- ==========================================
-- QA Verification Script for Task 4.1 (Vault)
-- ==========================================

-- Instructions:
-- 1. Run these queries in the Supabase Dashboard SQL Editor.
-- 2. Replace 'YOUR_MARKET_ID' with the actual market ID you are testing.
--    (You can find a market ID by running: SELECT id FROM markets LIMIT 1;)

-- ------------------------------------------
-- Step 1: Verify Data Integrity (Encryption)
-- ------------------------------------------
-- Confirm that the 'encrypted_token' column contains a base64 encoded string,
-- NOT the original plaintext JSON or token.
-- If the trigger is working, this value will change every time you insert/update
-- (due to random IV/nonce if using randomized encryption, or just look different from input).

SELECT
    id,
    market_id,
    provider,
    encrypted_token, -- CHECK THIS: Should be a long base64 string
    created_at
FROM
    public.vault_secrets
WHERE
    market_id = 'YOUR_MARKET_ID' -- Replace with your market ID
    AND provider = 'GTM';

-- ------------------------------------------
-- Step 2: Verify Decryption Logic
-- ------------------------------------------
-- Confirm that the system can decrypt the token back to its original form.
-- Note: The function `retrieve_decrypted_secret` is protected and only executable
-- by the `service_role`. In the Supabase Dashboard SQL Editor, you typically run
-- as a superuser (postgres) which bypasses this restriction.

SELECT
    public.retrieve_decrypted_secret(
        'YOUR_MARKET_ID', -- Replace with the same market ID
        'GTM'
    ) as decrypted_token_json;

-- If successful, 'decrypted_token_json' should be a JSON string like:
-- {"accessToken":"...","refreshToken":"..."}

-- ==========================================
-- End of Verification
-- ==========================================
