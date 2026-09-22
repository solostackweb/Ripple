# Ripple live setup

This guide gets the app from the reliable offline presentation to a real Supabase-backed workspace.

## 1. Supabase

Your project URL, anonymous key, and service-role key belong in `.env.local` locally and in Vercel Environment Variables for deployment:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Apply the SQL files in `supabase/migrations` in filename order. In Supabase Dashboard, open **Authentication → Providers → Anonymous Sign-Ins** and enable it for the conference prototype. Ripple creates a temporary authenticated user in Live mode; row-level security still isolates that user's workspace.

Create or verify the private source bucket with:

```bash
npm run supabase:setup
```

The first live import creates the private `event-sources` Storage bucket automatically. You can verify configuration without exposing secrets:

```bash
npm run supabase:check
```

## 2. Choose the AI engine

Open **AI engine** inside Ripple. You can select a provider, paste a key, and press **Test connection**. A key entered there stays in `sessionStorage` for the current browser tab and is sent only to Ripple's server route. It is not placed in Supabase or in the JavaScript bundle.

For the deployed product, set the key in Vercel instead:

```env
AI_PROVIDER=openai
AI_MODEL=gpt-5-mini
OPENAI_API_KEY=
```

For NVIDIA NIM:

```env
AI_PROVIDER=nvidia
AI_MODEL=openai/gpt-oss-20b
NVIDIA_API_KEY=
```

Use OpenAI for the conference when you receive the event key. `gpt-5-mini` is the default because this workflow needs fast structured extraction and impact analysis. NVIDIA NIM is a valid temporary alternative because Ripple uses the same OpenAI-compatible adapter; the application logic is not duplicated.

If neither key is present, Ripple intentionally falls back to its deterministic offline engine. This is the safe presentation fallback for weak Wi-Fi or exhausted credits.

## 3. Import the Astra event

In Live mode:

1. Confirm the event details.
2. Choose **Load the Astra data pack**.
3. Review the seven sources.
4. Choose **Build live workspace**.

Ripple uploads the files, stores the event and graph, creates initial response tasks, analyzes the urgent Facilities message, and reloads everything from Supabase. The same source files are available under `demo-data/astra-2026` if you want to upload them manually on stage.

## 4. Integrations with Composio

Create a Composio project and add its server key:

```env
COMPOSIO_API_KEY=
```

In Composio, create one auth config for each connector you want to demonstrate, then copy each auth-config ID into Vercel:

```env
COMPOSIO_AUTH_CONFIG_GMAIL=
COMPOSIO_AUTH_CONFIG_GOOGLEDRIVE=
COMPOSIO_AUTH_CONFIG_GOOGLECALENDAR=
COMPOSIO_AUTH_CONFIG_SLACK=
COMPOSIO_AUTH_CONFIG_NOTION=
COMPOSIO_AUTH_CONFIG_TRELLO=
COMPOSIO_AUTH_CONFIG_LINEAR=
COMPOSIO_AUTH_CONFIG_ASANA=
COMPOSIO_AUTH_CONFIG_OUTLOOK=
COMPOSIO_AUTH_CONFIG_ONEDRIVE=
```

The **Connect** button requests a short-lived hosted Connect Link from Ripple's server. OAuth credentials remain with Composio. The Integrations page shows whether each account is connected and includes an in-product setup guide.

For tomorrow, prioritize Gmail, Google Drive, and Google Calendar. They tell the clearest story: a Facilities email changes a fact; planning files reveal dependencies; the calendar reveals which published sessions must be updated.

## 5. Vercel

Add the same environment variables to **Project Settings → Environment Variables** for Production and Preview. Redeploy after changing environment variables. Your GitHub integration will deploy each pushed commit.

After deployment, verify:

1. Demo mode opens with no credentials required.
2. Live mode creates an anonymous Supabase session.
3. The Astra pack imports and the event survives a page refresh.
4. The graph can pan, zoom, drag nodes, and inspect a node.
5. Reporting a change produces impacts with the selected AI engine.
6. Adding an impact creates a task, and clicking a task advances its status.
7. **System** shows Supabase, database, storage, and the chosen AI provider as ready.

## Presentation sequence

Start in Demo mode and explain the problem in one sentence: “Event information lives in separate tools, so one late change creates invisible downstream work.” Then open the interactive graph, report the venue change, and accept one impact as a task. Switch to Live mode, load the Astra pack, and show that a refresh preserves the workspace. If conference Wi-Fi fails, return to Demo mode and continue the same story without interruption.
