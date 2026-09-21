import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeChange } from "@/lib/ai/provider";

const requestSchema = z.object({
  text: z.string().min(5).max(4_000),
  sourceId: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    return NextResponse.json(await analyzeChange(input));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid change report.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Analysis failed." },
      { status: 502 },
    );
  }
}
