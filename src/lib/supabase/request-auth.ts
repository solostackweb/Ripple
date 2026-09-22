import type { User } from "@supabase/supabase-js";
import { createPublicServerClient } from "./admin";
import { createAdminClient } from "./admin";

export async function requireRequestUser(request: Request): Promise<User> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) throw new RequestAuthError("Sign in before using Live mode.", 401);

  const supabase = createPublicServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new RequestAuthError("Your Live mode session expired. Start it again.", 401);
  return data.user;
}

export class RequestAuthError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function requireEventAccess(userId: string, eventId: string) {
  const admin = createAdminClient();
  const { data: event, error } = await admin.from("events").select("id,workspace_id").eq("id", eventId).single();
  if (error || !event) throw new RequestAuthError("Event not found.", 404);
  const { data: membership } = await admin.from("memberships").select("user_id").eq("workspace_id", event.workspace_id).eq("user_id", userId).maybeSingle();
  if (!membership) throw new RequestAuthError("You do not have access to this event.", 403);
  return { admin, event };
}
