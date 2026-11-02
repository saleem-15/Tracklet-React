---
name: modify-data-model
description: >
  Safely updates, extends, or migrates Tracklet's data models across all persistence and serialization layers.
  Autonomous Triggers: Use whenever the user asks to "add a field to jobs/applications/contacts", "update data model",
  "add column to table/export", "store a new property on applications", "change the schema", "rename a field",
  "add new contact attribute", or modifies Application, Contact, ApplicationTask, or EmailLog types.
  Enforces: The mandatory 5-step synchronization pipeline (1. src/types.ts -> 2. src/lib/applicationRepository.ts
  -> 3. src/lib/sampleData.ts -> 4. src/lib/exportCsv.ts & src/lib/importCsv.ts -> 5. firestore.rules),
  preventing silent Firestore security rejections and CSV roundtrip data loss.
  Boundaries: Use this skill whenever domain entities or persistence shapes are created or altered. For adding UI
  components that consume the model, follow with add-component or anti-slop-craft.
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

## Step 5: Update & Validate Firestore Rules (`firestore.rules`)
When adding, modifying, or restricting fields on `Application`, `Contact`, `ApplicationTask`, or `EmailLog`, update the validation rules in `firestore.rules` to account for the new attributes and prevent unauthorized or schema-violating writes. Ensure rules syntax and permissions are thoroughly checked and validated.

## Step 6: Update UI Components
Update detail panels, table columns, board cards, or edit forms as needed.

## Step 7: Verification
Run:
```bash
npx tsc --noEmit
npm run build
```
