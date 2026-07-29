---
target: src/components/AddApplicationModal.tsx
total_score: 38
max_score: 40
na_heuristics: 0
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 1
timestamp: 2026-07-29T08-43-35Z
slug: src-components-addapplicationmodal-tsx
---

## Design Health Score

| # | Heuristic | Score | Key Observation / Status |
|---|-----------|:---:|--------------------------|
| 1 | Visibility of System Status | 4 | Dynamic counters (`03. Pipeline Tasks (2)`), real-time company logo preview, domain auto-extraction from job link, and `isSubmitting` button feedback. |
| 2 | Match System / Real World | 4 | Logical 5-step creation flow: Company & Role -> Metadata -> Tasks -> Contacts -> Additional Notes. |
| 3 | User Control and Freedom | 4 | Inline add/remove buttons (`Trash2`) for dynamic tasks & contacts; `Esc` shortcut; unsaved draft confirmation dialog (`confirm('Discard unsaved job application entry?')`) added when closing with non-empty fields. |
| 4 | Consistency and Standards | 4 | Strictly obeys `DESIGN.md` Dual Register rule: Section step headings (`01. Role & Company Info`, `02. Pipeline Metadata`, etc.) use geometric `Outfit` (`font-display`). |
| 5 | Error Prevention | 4 | Required field indicators (`*`); intelligent draft recovery (captures typed un-added task/contact strings on main submit so user input is never lost). |
| 6 | Recognition Rather Than Recall | 4 | Real-time `CompanyLogo` avatar preview updating as domain or company name is typed; custom dropdown selects for status and platform. |
| 7 | Flexibility and Efficiency of Use | 4 | `Enter` key inside task title input triggers `handleAddTaskItem`; auto-parses company domain from pasted job URLs; focus-visible ring styles added to interactive inline buttons. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean 5-section progressive form layout; clear `font-display` section headers. |
| 9 | Error Recovery | 3 | Auto-resets form state on success; graceful try/catch block preserves user input on network or Firestore error. |
| 10 | Help and Documentation | 4 | Helpful input placeholders (`e.g. Linear, Stripe`, `https://...`), explicit `* Required` tag, and `Press Esc to exit` footer label. |
| **Total** | | **38/40** | **Excellent** |

---

## Applied Improvements Summary

1. **Dual-Register Typography (P1 Resolved)**:
   - Applied `font-display` (`Outfit`) to section step headings (`01. Role & Company Info`, `02. Pipeline Metadata`, `03. Pipeline Tasks`, `04. Key Contacts`, `05. Additional Notes`).

2. **Unsaved Draft Dismissal Safeguard (P2 Resolved)**:
   - Added `isDirty` check tracking active input across company, role, notes, job link, contacts list, tasks list, and draft inputs.
   - Added `handleRequestClose()` to trigger a confirmation prompt (`confirm('Discard unsaved job application entry?')`) before closing via backdrop click, `X` icon, or `Esc` key.

3. **Keyboard Focus Ring Styling (P2 Resolved)**:
   - Added `focus:outline-none focus:ring-2 focus:ring-blue-500/40` to inline `Add Task`, `Add Contact`, cancel, and close buttons for keyboard accessibility.
