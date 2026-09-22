# Ripple

Ripple is event change intelligence: it turns event files, messages, calendars, people, rooms, and tasks into a traceable knowledge graph, then shows what one late change affects.

The product has two deliberate modes:

- **Demo mode** is deterministic, runs without credentials, and contains the complete Astra conference story.
- **Live mode** authenticates with Supabase, uploads real source files to private storage, persists the event graph, analyzes changes with the selected AI provider, and saves tasks.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Use **Start Live mode** for real Supabase data, or keep the default offline presentation workspace.

## What is included

- Next.js 16, React 19, TypeScript, and responsive custom CSS
- Supabase Auth, Postgres, row-level security, and private Storage
- OpenAI and NVIDIA NIM through one OpenAI-compatible adapter
- Browser-session API key testing; keys are never written to the database
- File import and a complete Astra data pack
- Interactive React Flow event graph with evidence inspection
- Live changes, impacts, response tasks, event search, skeletons, and loading states
- Composio Connect Link support for Gmail, Drive, Calendar, Slack, Notion, Trello, Linear, Asana, Outlook, and OneDrive
- Honest setup states and per-integration setup instructions

See [LIVE_SETUP.md](./LIVE_SETUP.md) for the exact Supabase, AI, Composio, and Vercel setup. Presentation files are in [`demo-data/astra-2026`](./demo-data/astra-2026).

## Useful checks

```bash
npm run supabase:check
npm run lint
npm run build
```

Ripple keeps a human approval step between an AI suggestion and any external message or task assignment.
