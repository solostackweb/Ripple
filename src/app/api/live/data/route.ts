import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRequestUser, RequestAuthError } from "@/lib/supabase/request-auth";

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const admin = createAdminClient();
    const { data: memberships, error } = await admin.from("memberships").select("workspace_id").eq("user_id", user.id).limit(1);
    if (error) throw error;
    const workspaceId = memberships?.[0]?.workspace_id;
    if (!workspaceId) return NextResponse.json({ ok: true, event: null }, { headers: { "Cache-Control": "no-store" } });
    const { data: events, error: eventError } = await admin.from("events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(1);
    if (eventError) throw eventError;
    const event = events?.[0];
    if (!event) return NextResponse.json({ ok: true, event: null }, { headers: { "Cache-Control": "no-store" } });
    const [sources, entities, relationships, tasks, changes] = await Promise.all([
      admin.from("sources").select("id,title,kind,observed_at,metadata").eq("event_id", event.id).order("observed_at", { ascending: false }),
      admin.from("entities").select("id,name,kind,attributes,confidence").eq("event_id", event.id),
      admin.from("relationships").select("id,from_entity_id,to_entity_id,relation,confidence").eq("event_id", event.id),
      admin.from("tasks").select("id,title,status,due_at,assigned_to").eq("event_id", event.id).order("due_at"),
      admin.from("changes").select("id,summary,kind,confidence,status,created_at").eq("event_id", event.id).order("created_at", { ascending: false }),
    ]);
    for (const result of [sources, entities, relationships, tasks, changes]) if (result.error) throw result.error;
    const changeIds = (changes.data ?? []).map((change) => change.id);
    const impacts = changeIds.length ? await admin.from("impacts").select("id,change_id,area,title,explanation,severity,status").in("change_id", changeIds).order("created_at") : { data: [], error: null };
    if (impacts.error) throw impacts.error;
    return NextResponse.json({ ok: true, event, sources: sources.data ?? [], entities: entities.data ?? [], relationships: relationships.data ?? [], tasks: tasks.data ?? [], changes: changes.data ?? [], impacts: impacts.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof RequestAuthError ? error.status : 500;
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load Live mode." }, { status });
  }
}
