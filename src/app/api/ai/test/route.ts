import { NextResponse } from "next/server";
import { z } from "zod";
import { testProvider } from "@/lib/ai/provider";

const schema = z.object({
  provider: z.enum(["demo", "openai", "nvidia"]),
  model: z.string().min(1).max(120).optional(),
  apiKey: z.string().max(500).optional().transform((value) => value?.trim() || undefined).refine((value) => !value || value.length >= 8, "API key is too short."),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await testProvider(input);
    if (input.provider !== "demo" && result.provider !== input.provider) {
      return NextResponse.json({ ok: false, message: `No ${input.provider === "openai" ? "OpenAI" : "NVIDIA"} key was supplied in this session or configured on the server.` }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 502;
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid connection settings." : error instanceof Error ? error.message : "Connection test failed.";
    return NextResponse.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
