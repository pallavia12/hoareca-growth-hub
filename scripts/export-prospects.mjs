/**
 * Export prospects from Supabase to prospects-export.csv for lead matching.
 * Run: node scripts/export-prospects.mjs
 * Requires: .env with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");
const outputPath = join(__dirname, "../prospects-export.csv");

function loadEnv() {
  const text = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from("prospects")
  .select("id, restaurant_name, pincode, locality")
  .order("created_at", { ascending: false })
  .range(0, 99999);

if (error) {
  console.error("Error fetching prospects:", error.message);
  process.exit(1);
}

const rows = [["id", "restaurant_name", "pincode", "locality"].join(",")];
for (const p of data || []) {
  const escape = (s) => String(s ?? "").replace(/"/g, '""').replace(/,/g, ";");
  rows.push([p.id, escape(p.restaurant_name), escape(p.pincode), escape(p.locality)].join(","));
}

writeFileSync(outputPath, rows.join("\n"), "utf-8");
console.log(`Exported ${(data || []).length} prospects to prospects-export.csv`);
