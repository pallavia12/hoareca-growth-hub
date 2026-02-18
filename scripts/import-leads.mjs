/**
 * One-off import of leads from leads-upload.csv into Supabase.
 * Run: node scripts/import-leads.mjs
 * Requires: .env with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");
const inputPath = join(__dirname, "../leads-upload.csv");

function loadEnv() {
  const text = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += c;
  }
  result.push(current.trim());
  return result;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY) in .env");
  process.exit(1);
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Using anon key—RLS may block inserts. Add SUPABASE_SERVICE_ROLE_KEY to .env for one-time import.");
}

const supabase = createClient(url, key);

const text = readFileSync(inputPath, "utf-8");
const lines = text.split(/\r?\n/).filter((l) => l.trim());
if (lines.length < 2) {
  console.error("leads-upload.csv is empty or has no data rows");
  process.exit(1);
}

const headers = parseCSVLine(lines[0]);
const toObj = (values) => {
  const o = {};
  headers.forEach((h, i) => { o[h] = values[i] ?? ""; });
  return o;
};

const toNull = (v) => (v === "" || v === undefined || v === null ? null : v);
const toNum = (v) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const leads = [];
for (let i = 1; i < lines.length; i++) {
  const row = toObj(parseCSVLine(lines[i]));
  leads.push({
    client_name: row.client_name,
    pincode: row.pincode,
    locality: toNull(row.locality),
    gst_id: toNull(row.gst_id),
    avocado_consumption: toNull(row.avocado_consumption),
    purchase_manager_name: toNull(row.purchase_manager_name),
    pm_contact: toNull(row.pm_contact),
    email: toNull(row.email),
    last_activity_date: toNull(row.last_activity_date),
    appointment_date: toNull(row.appointment_date),
    appointment_time: toNull(row.appointment_time),
    outlet_photo_url: toNull(row.outlet_photo_url),
    remarks: toNull(row.remarks),
    status: row.status || "qualified",
    created_by: toNull(row.created_by),
    geo_lat: toNum(row.geo_lat),
    geo_lng: toNum(row.geo_lng),
    prospect_id: toNull(row.prospect_id),
    visit_count: toNum(row.visit_count) ?? 1,
  });
}

const BATCH = 100;
let success = 0;
let failed = 0;

for (let i = 0; i < leads.length; i += BATCH) {
  const batch = leads.slice(i, i + BATCH);
  const { error } = await supabase.from("leads").insert(batch);
  if (error) {
    console.error(`Batch ${Math.floor(i / BATCH) + 1} failed:`, error.message);
    failed += batch.length;
  } else {
    success += batch.length;
  }
}

console.log(`Done. Inserted: ${success}, Failed: ${failed}`);
