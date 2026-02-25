
## Changes: Log Visit Color + Qty/Ripeness UI Improvement

### 1. Log Visit Color — `#005c00`

All "Log Visit" buttons currently use `bg-success` (the CSS variable `--success: 122 39% 49%`). The user wants `#005c00` (a darker forest green).

**Approach**: Rather than using arbitrary inline styles scattered across 3 files, update the `--success` CSS variable in `src/index.css` to the equivalent HSL of `#005c00`:
- `#005c00` → HSL approximately `120, 100%, 18%`

This means updating one line in `src/index.css` and all `bg-success` buttons (Log Visit across all Steps 2–4) will automatically pick it up.

> Note: The sidebar background currently also uses a similar green. Only the `--success` token will be changed (not the sidebar tokens), so there should be no side effects on the sidebar.

---

### 2. Qty (Units) + Ripeness Stage — Improved UI in Step 4 Pending Orders

**Problem**: The two columns currently list qty values and ripeness values independently with only `space-y-0.5` spacing. When multiple combos exist (e.g., 3 entries), there's no visual demarcation between rows — they blur together.

**Solution**: Render each combo as a compact numbered **pill/tag row** inside a single merged approach — but since the user asked to keep two columns (Qty and Ripeness), we'll use **indexed mini-badges** per combo that clearly delineate each row:

Each combo will be rendered as a small badge like:
```
① 10     ① Stage 3
② 5      ② Stage 1
③ 8      ③ Stage 5
```

Using small numbered circles (1, 2, 3...) as inline prefixes in each row, with a subtle `border-b` separator between combos, or light alternating row styling.

**Technical implementation**:
- Wrap each combo item in a `div` with `border-b border-dashed border-muted last:border-0 py-0.5` so each line is visually separated.
- Add a small inline number badge `(i+1)` prefix in `text-[10px] bg-muted rounded-full w-4 h-4` to index the combo.
- Keep both columns in sync — the index number acts as the visual link between Qty and Ripeness cells.

**Mobile readability**: The columns will use `min-w-[60px]` to prevent collapsing, and the table already has `overflow-x-auto`.

---

### Files to Edit

| File | Change |
|---|---|
| `src/index.css` | Update `--success` HSL to match `#005c00` |
| `src/pages/AgreementsPage.tsx` | Improve Qty + Ripeness cell rendering in Pending Orders table |

No database changes required.
