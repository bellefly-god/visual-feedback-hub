# FeedbackMark

FeedbackMark is a lightweight visual feedback tool for image/PDF/screenshot review workflows.

## Run

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

## Modes

- Default: localStorage-backed data (`feedbackService`)
- Optional: Supabase-backed data (`supabaseFeedbackService`) when env vars are set

Use:
- `.env.example`
- `docs/supabase-schema.sql`
- `docs/supabase-setup.md`
