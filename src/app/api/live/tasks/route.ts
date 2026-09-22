import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventAccess, requireRequestUser, RequestAuthError } from "@/lib/supabase/request-auth";

const createSchema = z.object({ eventId: z.string().uuid(), title: z.string().min(2).max(240), impactId: z.string().uuid().optional() });
const updateSchema = z.object({ eventId: z.string().uuid(), taskId: z.string().uuid(), status: z.enum(["todo", "doing", "done"]) });

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request); const input = createSchema.parse(await request.json());
    const { admin } = await requireEventAccess(user.id, input.eventId);
    const { data, error } = await admin.from("tasks").insert({ event_id: input.eventId, impact_id: input.impactId, title: input.title, status: "todo", created_by: user.id }).select("id,title,status,due_at,assigned_to").single();
    if (error) throw error;
    if (input.impactId) await admin.from("impacts").update({ status: "accepted", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", input.impactId);
    return NextResponse.json({ ok: true, task: data });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRequestUser(request); const input = updateSchema.parse(await request.json());
    const { admin } = await requireEventAccess(user.id, input.eventId);
    const { data, error } = await admin.from("tasks").update({ status: input.status, updated_at: new Date().toISOString() }).eq("id", input.taskId).eq("event_id", input.eventId).select("id,title,status,due_at,assigned_to").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, task: data });
  } catch (error) { return failure(error); }
}

function failure(error: unknown) {
  const status = error instanceof RequestAuthError ? error.status : error instanceof z.ZodError ? 400 : 500;
  return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Task operation failed." }, { status });
}
