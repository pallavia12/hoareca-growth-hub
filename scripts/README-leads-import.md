# Lead Import (One-Time)

Import leads from `lead.csv` into Supabase.

## Flow

1. **Export prospects** (for prospect_id matching)
   ```bash
   npm run export-prospects
   ```
   Writes `prospects-export.csv`. Note: With anon key, RLS may return 0 rows. Export manually from Supabase if needed (id, restaurant_name, pincode, locality).

2. **Transform**
   ```bash
   npm run transform-leads
   ```
   Reads `../lead.csv` and `prospects-export.csv`. Outputs `leads-upload.csv` (only rows with Status = "Lead").

3. **Import**
   ```bash
   npm run import-leads
   ```
   Inserts `leads-upload.csv` into Supabase. Requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. **RLS blocks anon inserts**—add `SUPABASE_SERVICE_ROLE_KEY` to `.env` and update the import script to use it for this one-time import.

## SQL import (Lovable-managed Supabase)

If you can't use the Node import script (no service role key), generate SQL and run in Lovable's SQL editor:

```bash
npm run generate-leads-sql
```

This creates `leads-import.sql`. Copy its contents and run in **Lovable Cloud > Database > SQL editor**.

## File locations

- `lead.csv` — in PHD/ (parent of hoareca-growth-hub)
- `prospects-export.csv` — hoareca-growth-hub/
- `leads-upload.csv` — hoareca-growth-hub/
- `leads-import.sql` — hoareca-growth-hub/ (for Lovable SQL editor)
