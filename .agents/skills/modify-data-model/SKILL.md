---
name: modify-data-model
description: Guidelines for updating the Application data model across the codebase cleanly and thoroughly.
---

# Skill: Modifying the Data Model in Tracklet

When adding, renaming, or removing fields from the core `Application` interface:

## Step 1: Update `src/types.ts`
Modify the `Application` interface or related sub-interfaces (`Contact`, `ApplicationTask`, `EmailLog`, etc.).

## Step 2: Update Repository (`src/lib/applicationRepository.ts`)
Ensure `addApplication`, `updateApplication`, and `batchImport` properly handle the new/updated field.

## Step 3: Update Sample Data (`src/lib/sampleData.ts`)
Add realistic sample values for the new field in `INITIAL_SAMPLE_APPLICATIONS`.

## Step 4: Update CSV Utilities
- **Export** (`src/lib/exportCsv.ts`): Add column header and escaping logic if the field should be exported.
- **Import** (`src/lib/importCsv.ts`): Update header auto-detection and field mapping if the field should be imported from CSV.

## Step 5: Update UI Components
Update detail panels, table columns, board cards, or edit forms as needed.

## Step 6: Verification
Run:
```bash
npx tsc --noEmit
npm run build
```
