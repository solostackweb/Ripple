import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText.split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
  }),
);

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase URL or service role key is not configured.");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) throw listError;

if (!buckets?.some((bucket) => bucket.id === "event-sources")) {
  const { error } = await supabase.storage.createBucket("event-sources", {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["text/plain", "text/markdown", "text/csv", "application/json", "message/rfc822"],
  });
  if (error) throw error;
  console.log("Created private event-sources bucket.");
} else {
  console.log("Private event-sources bucket is already ready.");
}
