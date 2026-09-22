# Ripple demo runbook — Astra live workspace

## The one-sentence explanation

**Ripple watches the facts behind an event, understands what a new change affects, and turns approved consequences into trackable work.**

It is useful because event information is split across email, Drive, calendars, spreadsheets, and people's memory. A venue or schedule change is easy to read, but its hidden consequences—capacity, AV, signage, catering, speakers, attendee messages, and deadlines—are easy to miss.

## Before presenting

1. In Supabase, enable **Authentication → Providers → Anonymous Sign-Ins**.
2. Open Ripple and choose **Start Live mode**.
3. Open **AI engine**, select **NVIDIA NIM**, keep **GPT-OSS 20B**, paste the NVIDIA key, and press **Test connection**.
4. Choose **Use this configuration**.
5. Choose **Use complete Astra pack**, then **Build live workspace**.
6. Wait until the live Overview appears.
7. Press **Demo guide** in the top bar if you want the prompts visible while presenting.

`openai/gpt-oss-20b` is the right presentation choice here: it is fast enough for a live response and supports the structured JSON Ripple expects. Use the offline engine immediately if network latency becomes unpredictable.

## The six-minute presentation

### 0:00–0:40 — State the problem

Stay on **Overview**.

Say:

> Event teams already have the information they need, but it is scattered across messages, documents, calendars, and task boards. When one fact changes, the downstream work is invisible. Ripple makes that chain visible.

Point to **Grounded sources**, **verified graph facts**, and **Open actions**. Explain that these numbers are loaded from Supabase, not hard-coded presentation cards.

### 0:40–1:20 — Prove the evidence is real

Open **Sources**.

Say:

> For this demo I uploaded the Astra event brief, agenda, speakers, venue plan, operations sheet, communications draft, and a late Facilities update. Every AI conclusion keeps a link to this evidence.

The important source is `07-change-inbox.md`: Facilities moved the opening keynote from Main Auditorium to Innovation Hall. The new room holds 380 while 500 people are registered.

### 1:20–2:00 — Show the knowledge graph

Open **Event graph**. Drag one node and select **Innovation Hall**.

Say:

> Ripple does not search isolated documents. It turns their verified facts into a connected model: the keynote has a room, a speaker, an audience, AV equipment, signage, and operational tasks. This is how it knows where a change can propagate.

Point out the edge labels such as `moved to`, `attends`, `supports`, and `creates risk`.

### 2:00–3:10 — Show the ripple effect

Return to **Overview**.

Use the new **What Ripple just did** strip:

1. **Source** — the update was stored as evidence.
2. **Change** — NVIDIA extracted the changed fact with confidence.
3. **Ripple effect** — Ripple found the affected operational areas.
4. **Response** — only impacts you approve become tasks.

Say:

> A single venue sentence became capacity, production, and communication consequences. Ripple shows the reason and evidence for each one. It has not contacted anyone or changed another system without approval.

### 3:10–4:00 — Make an action propagate

Press **Add task** on one suggested impact.

Point out three immediate changes:

- The impact becomes **Task created**.
- **Open actions** increases.
- The unresolved blocker count falls and **Event health** improves.

Open **Tasks**. The new task is now in **Needs action**. Click the task once to move it to **In progress**, then click it again to mark it **Resolved**.

Say:

> This is the feedback loop: evidence creates an impact, human approval creates work, and task progress changes the operational picture.

### 4:00–5:10 — Analyze a new live update

Press **Report change** and choose **Panel time changed**.

Say:

> Now I am adding a change that was not in the uploaded pack. Ripple sends it to the selected NVIDIA model, validates the structured response, saves the change, and reloads the workspace from Supabase.

Press **Trace impact and save**. When Overview returns, point to the updated ripple chain and new consequences.

If NVIDIA takes longer than expected, say:

> The live model is tracing this against the event context. Ripple also has a deterministic offline engine so the operational workflow remains available when conference Wi-Fi is unreliable.

If it exceeds roughly ten seconds, switch the AI engine to **Offline demo** and repeat the action.

### 5:10–6:00 — Close with the product value

Say:

> Ripple is an event operations copilot with memory and causality. It collects facts from the tools teams already use, represents their dependencies, and helps a human turn late changes into an evidence-backed response plan. One change no longer becomes ten surprises.

## What each screen means

- **Overview:** current operational health, latest change, consequences, and next actions.
- **Event graph:** the connected facts Ripple uses to reason about downstream effects.
- **Sources:** the evidence library stored privately in Supabase.
- **Tasks:** approved consequences and their current execution state.
- **Integrations:** ways to collect future evidence from Gmail, Drive, Calendar, Slack, Notion, and task tools.
- **System:** whether Supabase, storage, integrations, and the selected AI provider are ready.

## Emergency fallback

If anything external fails:

1. Open **AI engine → Offline demo → Use this configuration**.
2. If Live mode itself is unavailable, choose **Use offline demo**.
3. Continue the same story with the venue change, event map, impacts, and task acceptance.

The offline mode is intentionally part of the product demonstration. It proves that the workflow and interface do not depend on a perfect network connection.
