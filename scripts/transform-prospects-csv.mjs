/**
 * Transform spreadsheet CSV to prospects upload format.
 * Run: node scripts/transform-prospects-csv.mjs
 * Reads: ../Untitled spreadsheet - Sheet1.csv
 * Writes: ../prospects-upload.csv
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, "../../Untitled spreadsheet - Sheet1.csv");
const outputPath = join(__dirname, "../prospects-upload.csv");

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else current += c;
  }
  result.push(current.trim());
  return result;
}

function localityFromLocation(loc) {
  if (!loc) return "";
  const parts = loc.split(",").map((p) => p.trim());
  const i = parts.findIndex((p) => p.toLowerCase() === "bangalore");
  return i > 0 ? parts[i - 1] : (parts[0] || "");
}

const text = readFileSync(inputPath, "utf-8");
const lines = text.split(/\r?\n/).filter((l) => l.trim());
const headers = parseCSVLine(lines[0]);
const getIdx = (name) => headers.findIndex((h) => new RegExp(name, "i").test(h));
const pincodeIdx = getIdx("pincode");
const nameIdx = getIdx("restaurant.*name");
const locationIdx = getIdx("^location$");
const typeIdx = getIdx("^type$");
const sourceIdx = getIdx("source");

const outHeader = "pincode,locality,restaurant_name,location,source,cuisine_type,tag,recall_date";
const outRows = [outHeader];

for (let i = 1; i < lines.length; i++) {
  const v = parseCSVLine(lines[i]);
  const get = (idx) => (idx >= 0 ? (v[idx] ?? "").trim() : "");
  const escape = (s) => String(s || "").replace(/,/g, ";");
  outRows.push([
    escape(get(pincodeIdx)),
    escape(localityFromLocation(get(locationIdx))),
    escape(get(nameIdx)),
    escape(get(locationIdx)),
    escape(get(sourceIdx)),
    escape(get(typeIdx)),
    "New",
    "",
  ].join(","));
}

writeFileSync(outputPath, outRows.join("\n"), "utf-8");
console.log(`Wrote ${outRows.length - 1} rows to prospects-upload.csv`);
