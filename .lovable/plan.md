
## Redesign: Qty + Ripeness as a Single Combined Column

### The Design Problem

Splitting related data (Qty and Ripeness) into two separate columns creates a **visual association problem**:
- The user must mentally scan across the row to connect Qty ① with Ripeness ①
- On mobile, this is even harder — columns are narrow, multi-line cells lose alignment
- No amount of pill styling fixes a fundamentally broken information architecture

### Design Principle Applied: **Co-locate related data**

Qty and Ripeness Stage are properties of the **same SKU combo** — they belong together. The correct pattern is a single column ("Order Details") where each combo is one compact, self-contained row item.

### New Layout: Single "Order Details" Column

Replace the two columns (Qty Units + Ripeness Stage) with one column **"Order Details"** that shows each combo as a horizontal pair:

```
Order Details
┌─────────────────────────────┐
│  10 units  ·  Stage 3       │
│   5 units  ·  Stage 1       │
│   8 units  ·  Stage 5       │
└─────────────────────────────┘
```

Each combo row:
- Left: **bold qty** (e.g. `10 units`) in a small green-tinted badge
- Separator: a subtle `·` dot
- Right: ripeness stage in a neutral muted badge
- The row itself has a clean `border-b border-muted/60 last:border-0 py-1.5` separator
- No alternating background — instead, a simple horizontal divider line between combos

This approach:
1. **Keeps related data together** — no cross-column scanning
2. **Works perfectly on mobile** — one column, naturally wraps
3. **Is visually clean** — uses line separators (not alternating backgrounds) which is a more professional design pattern
4. **Reduces table width** — one fewer column, more room for actions

### Technical Implementation

**File**: `src/pages/AgreementsPage.tsx`

Changes:
1. Remove the two `<TableHead>` entries for "Qty (Units)" and "Ripeness Stage"
2. Add one `<TableHead>` for "Order Details"
3. Replace the two `<TableCell>` blocks with one cell rendering each combo as `qty · ripeness` on its own line
4. Update `colSpan` values in empty/loading rows accordingly

**Rendering each combo:**
```tsx
<div className="flex flex-col divide-y divide-muted/60">
  {combos.map((c, i) => (
    <div key={i} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
      <span className="text-[11px] font-semibold bg-green-50 text-green-800 border border-green-200 px-1.5 py-0.5 rounded">
        {c.qty} units
      </span>
      <span className="text-muted-foreground text-[10px]">·</span>
      <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
        {c.ripeness}
      </span>
    </div>
  ))}
</div>
```

This gives a clean, scannable layout where each combo line is self-contained and readable even in a narrow column.
