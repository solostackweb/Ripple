import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText.split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
  }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase URL or service role key is not configured.");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const tables = ["workspaces", "memberships", "events", "sources", "entities", "relationships", "changes", "impacts", "tasks", "integrations"];
const results = [];
for (const table of tables) {
  const { error, count } = await supabase.from(table).select("*", { count: "exact", head: true });
  results.push({ table, ready: !error, rows: count ?? null, error: error?.code ?? null });
}
const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
results.push({ table: "storage:event-sources", ready: !bucketError && Boolean(buckets?.some((bucket) => bucket.id === "event-sources")), rows: null, error: bucketError?.name ?? null });

console.table(results);
if (results.some((result) => !result.ready)) process.exitCode = 1;
