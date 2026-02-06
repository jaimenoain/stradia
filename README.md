# stradia

## Setup Verification

### Environment Variables

To ensure your local development environment is set up correctly, you must configure the following environment variables.

1.  Copy `.env.example` to `.env.local`:
    ```bash
    cp .env.example .env.local
    ```

2.  Fill in the values in `.env.local` for the following keys:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY`
    *   `GEMINI_API_KEY`
