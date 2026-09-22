import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
}));

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured.");

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const publicClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const suffix = crypto.randomUUID();
const email = `ripple-e2e-${suffix}@example.invalid`;
const password = `Ripple-${crypto.randomBytes(20).toString("hex")}`;
let userId;
let workspaceId;

async function api(path, token, init = {}) {
  const response = await fetch(`http://localhost:3000${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${data.message ?? response.statusText}`);
  return data;
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { purpose: "ripple-e2e" } });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const signedIn = await publicClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("No test session returned.");
  const token = signedIn.data.session.access_token;

  const boot = await api("/api/live/bootstrap", token, { method: "POST", body: JSON.stringify({
    event: { name: `Ripple E2E ${suffix}`, startsAt: "2026-09-23T09:00:00+05:30", endsAt: "2026-09-23T18:00:00+05:30", location: "Innovation Hall", attendeeCount: 500 },
    sources: [{ name: "e2e-change.md", kind: "file", mimeType: "text/markdown", content: "The keynote moved from Main Auditorium to Innovation Hall. Innovation Hall seats 380." }],
    entities: [{ key: "event", kind: "event", name: "Test event", attributes: {} }, { key: "venue", kind: "venue", name: "Innovation Hall", attributes: { capacity: 380 } }],
    relationships: [["event", "venue", "moved_to"]],
  }) });
  const membership = await admin.from("memberships").select("workspace_id").eq("user_id", userId).single();
  if (membership.error) throw membership.error;
  workspaceId = membership.data.workspace_id;

  const analysis = await api("/api/live/analyze", token, { method: "POST", body: JSON.stringify({ eventId: boot.event.id, sourceId: boot.sources[0].id, text: "The keynote moved from Main Auditorium to Innovation Hall. Innovation Hall seats 380.", ai: { provider: "demo", model: "ripple-demo-engine" } }) });
  const task = await api("/api/live/tasks", token, { method: "POST", body: JSON.stringify({ eventId: boot.event.id, impactId: analysis.impacts[0].id, title: analysis.impacts[0].title }) });
  await api("/api/live/tasks", token, { method: "PATCH", body: JSON.stringify({ eventId: boot.event.id, taskId: task.task.id, status: "doing" }) });
  const loaded = await api("/api/live/data", token);
  console.log(JSON.stringify({ ok: true, event: loaded.event.name, sources: loaded.sources.length, entities: loaded.entities.length, relationships: loaded.relationships.length, changes: loaded.changes.length, impacts: loaded.impacts.length, tasks: loaded.tasks.length }));
} finally {
  if (userId) {
    const listed = await admin.storage.from("event-sources").list(userId, { limit: 100 });
    const eventFolders = listed.data ?? [];
    for (const folder of eventFolders) {
      const files = await admin.storage.from("event-sources").list(`${userId}/${folder.name}`, { limit: 100 });
      if (files.data?.length) await admin.storage.from("event-sources").remove(files.data.map((file) => `${userId}/${folder.name}/${file.name}`));
    }
  }
  if (workspaceId) await admin.from("workspaces").delete().eq("id", workspaceId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}
