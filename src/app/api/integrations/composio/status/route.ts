import { NextResponse } from "next/server";
import { Composio } from "@composio/core";
import { requireRequestUser, RequestAuthError } from "@/lib/supabase/request-auth";

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request);
    if (!process.env.COMPOSIO_API_KEY) return NextResponse.json({ ok: true, configured: false, accounts: [] });
    const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY, allowTracking: false });
    const accounts = await composio.connectedAccounts.list({ userIds: [user.id] });
    return NextResponse.json({ ok: true, configured: true, accounts: accounts.items.map((account) => ({ id: account.id, status: account.status, toolkit: account.toolkit?.slug })) });
  } catch (error) {
    const status = error instanceof RequestAuthError ? error.status : 500;
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load connections." }, { status });
  }
}
