import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeChange } from "@/lib/ai/provider";
import { requireEventAccess, requireRequestUser, RequestAuthError } from "@/lib/supabase/request-auth";

const schema = z.object({
  eventId: z.string().uuid(),
  text: z.string().min(5).max(8_000),
  sourceId: z.string().uuid().optional(),
  ai: z.object({ provider: z.enum(["demo", "openai", "nvidia"]), model: z.string().max(120).optional(), apiKey: z.string().max(500).optional() }).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const input = schema.parse(await request.json());
    const { admin } = await requireEventAccess(user.id, input.eventId);
    const result = await analyzeChange({ text: input.text, sourceId: input.sourceId ?? "manual-change" }, input.ai);
    const { data: change, error } = await admin.from("changes").insert({ event_id: input.eventId, source_id: input.sourceId, kind: result.change.kind, summary: result.change.summary, before_value: result.change.before ? { value: result.change.before } : null, after_value: { value: result.change.after }, confidence: result.change.confidence, status: "confirmed", confirmed_by: user.id, confirmed_at: new Date().toISOString() }).select("id").single();
    if (error) throw error;
    const { data: impacts, error: impactError } = await admin.from("impacts").insert(result.impacts.map((impact) => ({ change_id: change.id, area: impact.area, title: impact.title, explanation: impact.explanation, severity: impact.severity, evidence: impact.evidenceSourceIds.map((sourceId) => ({ sourceId })), status: "suggested" }))).select("id,area,title,explanation,severity,status");
    if (impactError) throw impactError;
    return NextResponse.json({ ok: true, changeId: change.id, impacts, analysis: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof RequestAuthError ? error.status : error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Live analysis failed." }, { status });
  }
}

