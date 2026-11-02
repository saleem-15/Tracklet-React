---
name: deepen-task
description: >-
  Deepen any task, spec, or prompt without scope bloat. Applies the 4-part expert rubric:
  (1) unasked professional practice, (2) rawest ground-truth material, (3) specific craft
  methods/tools, and (4) objective external verification before rewriting the prompt.
  Triggers on /deepen, /deepen-task, /deep, "deeper version of this task", "deepen this prompt",
  "deepen this task".
---

# Deepen Task (`/deepen`)

> *"I want a deeper version of this task, not a bigger one."*

Most prompt expansions inadvertently bloat tasks—adding extraneous features, superficial breadth, boilerplate, and scope creep. **Deepening** is the exact opposite: it increases resolution, moves closer to ground truth, adopts the rigorous techniques of elite domain specialists, and anchors success in objective reality rather than conversational agreement.

---

## When to Use

Activate this skill whenever:
- The user uses `/deepen`, `/deepen-task`, or `/deep`.
- The user says *"I want a deeper version of this task, not a bigger one"* or similar phrasing.
- The user asks to deepen, sharpen, or elevate a prompt, spec, or task without bloating its scope.
- The user asks what a top professional in a specific domain would actually do, what raw materials they start from, what tools/methods they use, and how to verify it objectively.
- A task feels superficial, generic, or pre-chewed and needs first-principles rigor.

---

## The 4-Part Diagnostic Framework

Before rewriting the prompt, execute this 4-step analysis systematically. Do not skip any step.

### 1. Unspoken Professional Practice
*What would a top professional in this field do and hear that is not being asked for?*
- **Identify latent complexity:** What does an industry-leading expert know that a non-expert fails to ask for?
- **Uncover unspoken constraints & invariants:** Performance limits, security attack surfaces, race conditions, memory pressure, edge-case failure modes, business/legal ramifications.
- **Surface the craft instincts:** How does an elite practitioner reframe the problem to solve the root cause rather than treating the symptom?

### 2. The Rawest Material
*What is the rawest material they would start from instead of what has already been digested?*
- **Bypass secondary abstractions:** Strip away summarized reports, marketing brochures, generic tutorials, or third-party interpretations.
- **Pinpoint primary ground truth:**
  - *Code/Systems:* Raw byte dumps, memory flamegraphs, execution traces, ASTs, uncompiled specs, database transaction logs, network packet captures (PCAP), kernel telemetry.
  - *Product/UX:* Unedited user session recordings, raw event streams, unfiltered user verbatims, raw churn telemetry.
  - *Business/Strategy:* Raw ledger transactions, unmassaged unit economics, original contractual clauses, primary regulatory filings.
- **Specify input requirements:** State precisely what raw input data must be gathered or provided.

### 3. Specific Methods and Tools
*What specific methods, diagnostic techniques, and tools would they use?*
- **Name exact instruments:** Reject vague advice like "profile the code" or "conduct user testing". Name the specific utilities, flags, frameworks, and profilers (e.g., `pprof`, `BPF trace`, `valgrind`, `pytest-benchmark`, `Chrome DevTools Heap Snapshot`, strict AST parsers, mutation testing frameworks).
- **Detail formal methodologies:** Property-based testing, formal invariant verification, double-entry reconciliation, structural equation modeling, heuristic walkthroughs.

### 4. Independent, Objective Verification
*What, other than you or me, would show the result is right?*
- **Reject subjective consensus:** "It looks correct", "it feels clean", or "the AI approved it" are not acceptable proofs.
- **Establish empirical external gates:**
  - Automated test suites (mutation score > 90%, property-based test suites with 10k random runs).
  - Deterministic metrics (p99 latency < 15ms under 5k RPS, zero allocated bytes on hot path).
  - External validators (compiler passes with zero warnings under `-Wall -Wextra -Werror`, schema validation against strict RFC schemas).
  - Hardware/runtime ground truth (kernel trace points, differential test comparison against reference implementation).

---

## Output Format

When executing this skill, output the diagnostic analysis first, followed by the rewritten high-depth prompt in a copyable code block:

```markdown
# Deep Task Analysis: [Task Name]

## 1. What a Top Professional Would Do (The Unasked Necessities)
[Identify the hidden nuances, second-order effects, and domain standards an elite practitioner immediately considers.]

## 2. The Rawest Material
[Identify the unvarnished primary artifacts and raw inputs required, bypassing pre-digested summaries.]

## 3. Specific Methods & Tools
[Detail the exact professional toolchains, diagnostic utilities, and structured craft methodologies.]

## 4. Objective, Independent Verification
[Specify the external, non-human, non-subjective proofs of correctness.]

---

## 🎯 Rewritten High-Depth Prompt

\`\`\`markdown
[The refined, precision-engineered prompt that incorporates all 4 dimensions while fiercely resisting scope bloat.]
\`\`\`
```

---

## Golden Rules for the Rewritten Prompt

1. **Depth Over Breadth:** Do NOT add new features, peripheral modules, or unrelated bells and whistles. Make the existing task 10x more rigorous, not 10x wider.
2. **Actionable & Self-Contained:** The rewritten prompt must clearly define the raw inputs to ingest, the exact methods/tools to apply, and the non-negotiable verification gates required to declare victory.
3. **Relentless Specificity:** Never use generic placeholders when concrete technical standards exist.
