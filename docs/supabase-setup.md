# Supabase Setup (MVP)

1. Open Supabase SQL editor and run:
- `docs/supabase-schema.sql`

2. Copy environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Create local env file:
- Copy `.env.example` to `.env`
- Fill the two Supabase variables

4. Start app:
- `npm run dev -- --host 127.0.0.1 --port 4173`

Notes:
- If env vars are empty, app automatically uses localStorage mode.
- In Supabase mode, uploaded files go to public bucket `feedback-assets`.
- Current schema keeps RLS disabled for MVP simplicity.
