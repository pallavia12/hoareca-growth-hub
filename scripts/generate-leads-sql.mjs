/**
 * Generate leads-import.sql from leads-upload.csv for running in Lovable SQL editor.
 * Run: node scripts/generate-leads-sql.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, "../leads-upload.csv");
const outputPath = join(__dirname, "../leads-import.sql");

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

function sqlEscape(s) {
  if (s === "" || s === undefined || s === null) return null;
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function sqlNum(v) {
  if (v === "" || v === undefined || v === null) return "NULL";
  const n = parseFloat(v);
  return isNaN(n) ? "NULL" : String(n);
}

function sqlUuid(v) {
  if (v === "" || v === undefined || v === null) return "NULL";
  const s = String(v).trim();
  if (!s) return "NULL";
  return "'" + s.replace(/'/g, "''") + "'";
}

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

const inserts = [];
inserts.push("-- Run this in Lovable Cloud > SQL editor");
inserts.push("-- Generated from leads-upload.csv");
inserts.push("");

for (let i = 1; i < lines.length; i++) {
  const row = toObj(parseCSVLine(lines[i]));
  const values = [
    sqlEscape(row.client_name),
    sqlEscape(row.pincode),
    sqlEscape(row.locality) ?? "NULL",
    sqlEscape(row.gst_id) ?? "NULL",
    sqlEscape(row.avocado_consumption) ?? "NULL",
    sqlEscape(row.purchase_manager_name) ?? "NULL",
    sqlEscape(row.pm_contact) ?? "NULL",
    sqlEscape(row.email) ?? "NULL",
    sqlEscape(row.last_activity_date) ?? "NULL",
    sqlEscape(row.appointment_date) ?? "NULL",
    sqlEscape(row.appointment_time) ?? "NULL",
    sqlEscape(row.outlet_photo_url) ?? "NULL",
    sqlEscape(row.remarks) ?? "NULL",
    sqlEscape(row.status) ?? "'qualified'",
    sqlEscape(row.created_by) ?? "NULL",
    sqlNum(row.geo_lat),
    sqlNum(row.geo_lng),
    sqlUuid(row.prospect_id),
    sqlNum(row.visit_count) !== "NULL" ? sqlNum(row.visit_count) : "1",
  ];
  inserts.push(
    `INSERT INTO leads (client_name, pincode, locality, gst_id, avocado_consumption, purchase_manager_name, pm_contact, email, last_activity_date, appointment_date, appointment_time, outlet_photo_url, remarks, status, created_by, geo_lat, geo_lng, prospect_id, visit_count) VALUES (${values.join(", ")});`
  );
}

writeFileSync(outputPath, inserts.join("\n"), "utf-8");
console.log(`Generated leads-import.sql with ${inserts.length - 3} INSERT statements`);
console.log("Run this file in Lovable Cloud > Database > SQL editor");
