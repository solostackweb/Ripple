import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRequestUser, RequestAuthError } from "@/lib/supabase/request-auth";

export const runtime = "nodejs";

const sourceSchema = z.object({
  name: z.string().min(1).max(180),
  kind: z.enum(["manual", "file", "gmail", "google_drive", "google_calendar"]),
  mimeType: z.string().min(1).max(120),
  content: z.string().max(500_000),
});

const entitySchema = z.object({
  key: z.string().min(1).max(100),
  kind: z.string().min(1).max(60),
  name: z.string().min(1).max(180),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

const requestSchema = z.object({
  event: z.object({
    name: z.string().min(2).max(180),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    location: z.string().min(2).max(240),
    attendeeCount: z.number().int().min(0).max(100_000),
  }),
  sources: z.array(sourceSchema).min(1).max(30),
  entities: z.array(entitySchema).max(200).default([]),
  relationships: z.array(z.tuple([z.string(), z.string(), z.string()])).max(500).default([]),
});

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const input = requestSchema.parse(await request.json());
    const admin = createAdminClient();

    const { data: memberships, error: membershipError } = await admin.from("memberships").select("workspace_id").eq("user_id", user.id).limit(1);
    if (membershipError) throw membershipError;

    let workspaceId = memberships?.[0]?.workspace_id as string | undefined;
    if (!workspaceId) {
      const { data: workspace, error } = await admin.from("workspaces").insert({ name: `${input.event.name} workspace`, created_by: user.id }).select("id").single();
      if (error) throw error;
      workspaceId = workspace.id;
    }

    const { data: existing } = await admin.from("events").select("id").eq("workspace_id", workspaceId).eq("name", input.event.name).limit(1);
    let eventId = existing?.[0]?.id as string | undefined;
    if (!eventId) {
      const { data: event, error } = await admin.from("events").insert({
        workspace_id: workspaceId,
        name: input.event.name,
        starts_at: input.event.startsAt,
        ends_at: input.event.endsAt,
        location: input.event.location,
        attendee_count: input.event.attendeeCount,
        status: "active",
      }).select("id").single();
      if (error) throw error;
      eventId = event.id;
    }

    const { data: buckets, error: bucketListError } = await admin.storage.listBuckets();
    if (bucketListError) throw bucketListError;
    if (!buckets?.some((bucket) => bucket.id === "event-sources")) {
      const { error } = await admin.storage.createBucket("event-sources", { public: false, fileSizeLimit: 10 * 1024 * 1024 });
      if (error && !error.message.toLowerCase().includes("already exists")) throw error;
    }

    const sourceRows = [];
    for (const [index, source] of input.sources.entries()) {
      const safeName = source.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${user.id}/${eventId}/${Date.now()}-${index}-${safeName}`;
      const { error: uploadError } = await admin.storage.from("event-sources").upload(storagePath, new Blob([source.content], { type: source.mimeType }), { contentType: source.mimeType, upsert: false });
      if (uploadError) throw uploadError;
      sourceRows.push({ event_id: eventId, kind: source.kind, external_id: storagePath, title: source.name, uri: `storage://event-sources/${storagePath}`, content_text: source.content, metadata: { mimeType: source.mimeType, bytes: source.content.length } });
    }

    const { data: insertedSources, error: sourceError } = await admin.from("sources").upsert(sourceRows, { onConflict: "event_id,kind,external_id" }).select("id,title,kind,observed_at,metadata");
    if (sourceError) throw sourceError;

    const { data: currentEntities } = await admin.from("entities").select("id,name,kind,attributes").eq("event_id", eventId);
    let insertedEntities = currentEntities ?? [];
    if (insertedEntities.length === 0 && input.entities.length > 0) {
      const sourceId = insertedSources?.[0]?.id;
      const { data, error } = await admin.from("entities").insert(input.entities.map((entity) => ({ event_id: eventId, kind: entity.kind, name: entity.name, attributes: { ...entity.attributes, importKey: entity.key }, source_id: sourceId, confidence: 0.98 }))).select("id,name,kind,attributes");
      if (error) throw error;
      insertedEntities = data;

      const byKey = new Map(insertedEntities.map((entity) => [String((entity.attributes as Record<string, unknown>)?.importKey), entity.id]));
      const relationshipRows = input.relationships.flatMap(([from, to, relation]) => {
        const fromId = byKey.get(from); const toId = byKey.get(to);
        return fromId && toId ? [{ event_id: eventId, from_entity_id: fromId, to_entity_id: toId, relation, source_id: sourceId, confidence: 0.97 }] : [];
      });
      if (relationshipRows.length) {
        const { error: relationError } = await admin.from("relationships").upsert(relationshipRows, { onConflict: "from_entity_id,to_entity_id,relation" });
        if (relationError) throw relationError;
      }
    }

    const { data: currentTasks } = await admin.from("tasks").select("id").eq("event_id", eventId).limit(1);
    if (!currentTasks?.length) {
      const dueBase = "2026-09-22T";
      const tasks = [
        ["Confirm overflow room capacity", "todo", `${dueBase}18:00:00+05:30`],
        ["Move keynote streaming encoder", "todo", `${dueBase}19:00:00+05:30`],
        ["Replace keynote wayfinding signs", "doing", `${dueBase}20:00:00+05:30`],
        ["Approve attendee venue update", "todo", `${dueBase}21:00:00+05:30`],
      ];
      const { error } = await admin.from("tasks").insert(tasks.map(([title, status, dueAt]) => ({ event_id: eventId, title, status, due_at: dueAt, created_by: user.id })));
      if (error) throw error;
    }

    if (!eventId) throw new Error("The event could not be created.");
    const data = await loadEventData(admin, eventId);
    return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof RequestAuthError ? error.status : error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Live event setup failed." }, { status });
  }
}

async function loadEventData(admin: ReturnType<typeof createAdminClient>, eventId: string) {
  const [event, sources, entities, relationships, tasks, changes] = await Promise.all([
    admin.from("events").select("*").eq("id", eventId).single(),
    admin.from("sources").select("id,title,kind,observed_at,metadata").eq("event_id", eventId).order("observed_at", { ascending: false }),
    admin.from("entities").select("id,name,kind,attributes,confidence").eq("event_id", eventId),
    admin.from("relationships").select("id,from_entity_id,to_entity_id,relation,confidence").eq("event_id", eventId),
    admin.from("tasks").select("id,title,status,due_at,assigned_to").eq("event_id", eventId).order("due_at"),
    admin.from("changes").select("id,summary,kind,confidence,status,created_at").eq("event_id", eventId).order("created_at", { ascending: false }),
  ]);
  for (const result of [event, sources, entities, relationships, tasks, changes]) if (result.error) throw result.error;
  const changeIds = (changes.data ?? []).map((change) => change.id);
  const impacts = changeIds.length ? await admin.from("impacts").select("id,change_id,area,title,explanation,severity,status").in("change_id", changeIds).order("created_at") : { data: [], error: null };
  if (impacts.error) throw impacts.error;
  return { event: event.data, sources: sources.data ?? [], entities: entities.data ?? [], relationships: relationships.data ?? [], tasks: tasks.data ?? [], changes: changes.data ?? [], impacts: impacts.data ?? [] };
}
