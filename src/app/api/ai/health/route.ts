import { NextResponse } from "next/server";
import { testProvider } from "@/lib/ai/provider";

export async function GET() {
  try {
    return NextResponse.json(await testProvider());
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "The provider test failed.",
      },
      { status: 502 },
    );
  }
}

