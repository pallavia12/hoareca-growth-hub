/**
 * Transform lead.csv to leads-upload.csv for import.
 * Only rows with Status = "Lead" are included.
 * Run: node scripts/transform-leads-csv.mjs
 * Requires: lead.csv and prospects-export.csv in parent dir (PHD)
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = join(__dirname, "../..");
const leadPath = join(baseDir, "lead.csv");
const prospectsPath = join(__dirname, "../prospects-export.csv");
const outputPath = join(__dirname, "../leads-upload.csv");

const KAM_TO_EMAIL = {
  Likitha: "likhitha@ninjacart.com",
  Pritha: "preethi@ninjacart.com",
  Sonu: "sonu@ninjacart.com",
  Srihari: "srihari@ninjacart.com",
  Tanmoy: "tanmoy@ninjacart.com",
};

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

function parseDate(s) {
  if (!s || !s.trim()) return null;
  const parts = s.trim().split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  const mm = m.padStart(2, "0");
  const dd = d.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function parseLatLng(s) {
  if (!s || !s.trim()) return [null, null];
  const parts = s.trim().split(",").map((p) => p.trim());
  if (parts.length < 2) return [null, null];
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  return [isNaN(lat) ? null : lat, isNaN(lng) ? null : lng];
}

function avocadoTypeToConsumption(type) {
  const t = (type || "").trim().toLowerCase();
  if (t.includes("haas") || t.includes("hass")) return "Yes - Imported";
  if (t.includes("indian")) return "Yes - Indian";
  return null;
}

// Load prospects for matching
let prospects = [];
try {
  const pText = readFileSync(prospectsPath, "utf-8");
  const pLines = pText.split(/\r?\n/).filter((l) => l.trim());
  const pHeader = pLines[0].split(",").map((h) => h.trim().toLowerCase());
  const idIdx = pHeader.indexOf("id");
  const nameIdx = pHeader.findIndex((h) => h.includes("restaurant") && h.includes("name"));
  const pincodeIdx = pHeader.indexOf("pincode");
  for (let i = 1; i < pLines.length; i++) {
    const v = parseCSVLine(pLines[i]);
    prospects.push({
      id: v[idIdx]?.trim() || "",
      restaurant_name: (v[nameIdx] ?? "").trim().toLowerCase(),
      pincode: (v[pincodeIdx] ?? "").trim(),
    });
  }
} catch (e) {
  console.warn("Could not load prospects-export.csv:", e.message);
}

function findProspectId(clientName, pincode) {
  const name = (clientName || "").trim().toLowerCase();
  const pin = (pincode || "").trim();
  if (!name || !pin) return null;
  const match = prospects.find(
    (p) => p.restaurant_name === name && p.pincode === pin
  );
  return match?.id || null;
}

const text = readFileSync(leadPath, "utf-8");
const lines = text.split(/\r?\n/).filter((l) => l.trim());
const headers = parseCSVLine(lines[0]);
const getIdx = (name) => headers.findIndex((h) => new RegExp(name, "i").test(h));

const idx = {
  kam: getIdx("^KAM$"),
  visitDate: getIdx("visit date"),
  customerName: getIdx("customer name"),
  locationPhoto: getIdx("location photo"),
  pincode: getIdx("^pincode$"),
  location: getIdx("^location$"),
  gst: getIdx("^GST$"),
  avocadoType: getIdx("avocado type"),
  purchaseManagerName: getIdx("purchase manager name"),
  purchaseManagerContact: getIdx("purchase manager contact"),
  purchaseMail: getIdx("purchase official mail"),
  deliverySlot: getIdx("delivery slot"),
  status: getIdx("^status$"),
  remarks: getIdx("remarks"),
};

const outHeader = "client_name,pincode,locality,gst_id,avocado_consumption,purchase_manager_name,pm_contact,email,last_activity_date,appointment_date,appointment_time,outlet_photo_url,remarks,status,created_by,geo_lat,geo_lng,prospect_id,visit_count";
const outRows = [outHeader];

let count = 0;
for (let i = 1; i < lines.length; i++) {
  const v = parseCSVLine(lines[i]);
  const get = (key) => (idx[key] >= 0 ? (v[idx[key]] ?? "").trim() : "");

  const status = get("status");
  if (!status || !status.toLowerCase().includes("lead")) continue;

  const clientName = get("customerName");
  if (!clientName) continue;

  let pincode = get("pincode");
  if (!pincode || pincode === ".") pincode = "000000";

  const visitDate = get("visitDate");
  const dateStr = parseDate(visitDate);
  const [geoLat, geoLng] = parseLatLng(get("location"));
  const avocadoConsumption = avocadoTypeToConsumption(get("avocadoType"));
  const kam = get("kam");
  const createdBy = KAM_TO_EMAIL[kam] || null;

  const prospectId = findProspectId(clientName, pincode);

  const escape = (s) => String(s ?? "").replace(/"/g, '""').replace(/,/g, ";");
  outRows.push([
    escape(clientName),
    escape(pincode),
    "", // locality - not in lead.csv
    escape(get("gst")),
    escape(avocadoConsumption),
    escape(get("purchaseManagerName")),
    escape(get("purchaseManagerContact")),
    escape(get("purchaseMail")),
    escape(dateStr),
    escape(dateStr),
    escape(get("deliverySlot")),
    escape(get("locationPhoto")),
    escape(get("remarks")),
    "qualified",
    escape(createdBy),
    geoLat ?? "",
    geoLng ?? "",
    escape(prospectId),
    "1",
  ].join(","));
  count++;
}

writeFileSync(outputPath, outRows.join("\n"), "utf-8");
console.log(`Wrote ${count} leads (Status=Lead) to leads-upload.csv`);
