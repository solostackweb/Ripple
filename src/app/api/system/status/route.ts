import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const status = {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    database: false,
    storage: false,
    composio: Boolean(process.env.COMPOSIO_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    nvidia: Boolean(process.env.NVIDIA_API_KEY),
  };
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("events").select("id", { head: true, count: "exact" });
    status.database = !error;
    const { data } = await admin.storage.listBuckets();
    status.storage = Boolean(data?.some((bucket) => bucket.id === "event-sources"));
  } catch { /* individual flags remain false */ }
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}

