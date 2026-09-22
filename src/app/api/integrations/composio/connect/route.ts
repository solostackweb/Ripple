import { NextResponse } from "next/server";
import { Composio } from "@composio/core";
import { z } from "zod";
import { requireRequestUser, RequestAuthError } from "@/lib/supabase/request-auth";

const toolkitSchema = z.enum(["gmail", "googledrive", "googlecalendar", "slack", "notion", "trello", "linear", "asana", "outlook", "onedrive"]);

const configNames: Record<z.infer<typeof toolkitSchema>, string> = {
  gmail: "COMPOSIO_AUTH_CONFIG_GMAIL",
  googledrive: "COMPOSIO_AUTH_CONFIG_GOOGLEDRIVE",
  googlecalendar: "COMPOSIO_AUTH_CONFIG_GOOGLECALENDAR",
  slack: "COMPOSIO_AUTH_CONFIG_SLACK",
  notion: "COMPOSIO_AUTH_CONFIG_NOTION",
  trello: "COMPOSIO_AUTH_CONFIG_TRELLO",
  linear: "COMPOSIO_AUTH_CONFIG_LINEAR",
  asana: "COMPOSIO_AUTH_CONFIG_ASANA",
  outlook: "COMPOSIO_AUTH_CONFIG_OUTLOOK",
  onedrive: "COMPOSIO_AUTH_CONFIG_ONEDRIVE",
};

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const { toolkit } = z.object({ toolkit: toolkitSchema }).parse(await request.json());
    const apiKey = process.env.COMPOSIO_API_KEY;
    const authConfigId = process.env[configNames[toolkit]];
    if (!apiKey || !authConfigId) {
      return NextResponse.json({ ok: false, needsSetup: true, message: `Add COMPOSIO_API_KEY and ${configNames[toolkit]} in Vercel and .env.local.` }, { status: 409 });
    }
    const composio = new Composio({ apiKey, allowTracking: false });
    const origin = new URL(request.url).origin;
    const connection = await composio.connectedAccounts.link(user.id, authConfigId, { callbackUrl: `${origin}/?mode=live&connected=${toolkit}` });
    return NextResponse.json({ ok: true, redirectUrl: connection.redirectUrl, connectionId: connection.id });
  } catch (error) {
    const status = error instanceof RequestAuthError ? error.status : error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not start connection." }, { status });
  }
}

