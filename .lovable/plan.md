

# Fix: Note Editor Focus Loss + Health Module Build Errors

## Two Issues

### 1. Note Editor loses focus on every keystroke

**Root cause**: In `RichNotesEditor.tsx` (lines 51-54), there's a `useEffect` that re-parses the `value` prop whenever it changes:

```typescript
useEffect(() => {
  const parsed = parseNotes(value);
  setNotesData(parsed);
}, [value]);
```

The cycle: User types → `handleBlockContentChange` → `emitChange` → `onChange(serialized)` → parent updates `content` state → new `value` prop flows back → `useEffect` fires → `setNotesData(parsed)` → full re-render → focus lost.

**Fix**: Track whether the change originated internally using a ref. Skip the sync `useEffect` when the change came from inside the editor.

```typescript
const isInternalChange = useRef(false);

const emitChange = useCallback((data: NotesData) => {
  isInternalChange.current = true;
  setNotesData(data);
  onChange(serializeNotes(data));
}, [onChange]);

useEffect(() => {
  if (isInternalChange.current) {
    isInternalChange.current = false;
    return;
  }
  setNotesData(parseNotes(value));
}, [value]);
```

### 2. Health module build errors — missing table types

**Root cause**: The auto-generated `types.ts` doesn't include `health_documents` or `health_measurements` tables, so TypeScript rejects `supabase.from('health_documents')`. The types file cannot be edited manually.

**Fix**: Cast the table name to `any` at each call site across 4 files:
- `src/features/health/hooks/useHealthDocuments.ts` — ~8 occurrences
- `src/features/health/components/AddHealthDocumentModal.tsx` — 1 occurrence  
- `src/features/health/components/AddMeasurementModal.tsx` — 1 occurrence
- `src/features/health/components/HealthDocumentDetailModal.tsx` — 3 occurrences
- `src/features/health/pages/HealthPage.tsx` — 1 occurrence

Pattern: `supabase.from(HEALTH_TABLES.DOCUMENTS)` → `supabase.from(HEALTH_TABLES.DOCUMENTS as any)`

And cast query results: `as HealthDocument[]` / `as HealthDocument` where needed.

## Files Changed

| File | Change |
|------|--------|
| `src/features/bookmarks/components/RichNotesEditor.tsx` | Add ref guard to prevent re-render cycle |
| `src/features/health/hooks/useHealthDocuments.ts` | Add `as any` casts to `.from()` calls |
| `src/features/health/components/AddHealthDocumentModal.tsx` | Add `as any` cast |
| `src/features/health/components/AddMeasurementModal.tsx` | Add `as any` cast |
| `src/features/health/components/HealthDocumentDetailModal.tsx` | Add `as any` casts |
| `src/features/health/pages/HealthPage.tsx` | Add `as any` cast |

