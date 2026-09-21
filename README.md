# Ripple

Ripple is event change intelligence. It connects event facts, documents, messages, decisions, and tasks so an organiser can see what one change affects before it becomes ten problems.

## Demo

The current build is intentionally useful without credentials. It includes realistic Astra conference data and a complete presentation flow:

1. Report a venue, speaker, or schedule change.
2. Review Ripple's interpretation, evidence source, and confidence.
3. Confirm the change and inspect its downstream consequences.
4. Add selected consequences to the response plan.

Run it locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Technical foundation

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- Supabase Postgres/Auth with row-level security
- OpenAI structured outputs validated by Zod
- Composio planned for initial Gmail, Google Drive, and Calendar connections

Copy `.env.example` to `.env.local` when credentials are available. Apply `supabase/migrations/202609220001_initial_schema.sql` to create the multi-tenant event graph, sources, changes, impacts, and tasks.

## Model routing

- `gpt-5.6-luna`: extraction and classification from messages/files
- `gpt-5.6-terra`: multi-hop impact analysis and communication drafts
- `gpt-5.6-sol`: escalation for ambiguous or high-stakes analysis

The product keeps a human approval step between an AI suggestion and any external message or task assignment.
