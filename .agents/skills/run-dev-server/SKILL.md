---
name: run-dev-server
description: >
  Safely inspects, launches, and manages isolated development servers for each Git worktree: a dedicated Vite
  frontend dev server (http://localhost:3000+) and an isolated Agentation MCP server (http://localhost:4747+).
  Autonomous Triggers: Use whenever the user asks to "run server", "run dev server", "start servers",
  "start dev", "run mcp server", "launch local environment", "start agentation", or runs /dev, /servers, /run-servers.
  Enforces: 100% worktree isolation (never share dev or MCP servers across different branches/worktrees),
  dynamic port allocation (Vite 3000+ & Agentation 4747+), automatic VITE_AGENTATION_ENDPOINT binding,
  and local worktree state tracking via .worktree-servers.json.
---

# Skill: Run Development & MCP Server (`run-dev-server`)

This skill coordinates the auditing, launching, and lifecycle management of isolated local servers across **concurrent Git worktrees**.

---

## 1. Core Principles & Multi-Worktree Isolation Rule

1. **Strict Multi-Worktree Isolation (Mandatory)**:
   - When developers work across multiple git worktrees concurrently, **NEVER reuse servers or ports from another worktree**.
   - **Why cross-sharing is strictly prohibited**:
     - If Worktree B attaches to Worktree A's port `3000`, the browser renders Worktree A's code instead of Worktree B's changes.
     - If Worktree B shares Worktree A's port `4747`, visual UI annotations from Worktree B route to Worktree A's AI agent, causing severe cross-agent confusion and broken patches.
   - **The Rule**: Each worktree **MUST** run its own isolated Vite server on its own port (`3000`, `3001`, `3002`, ...) AND its own isolated Agentation MCP server on its own port (`4747`, `4748`, `4749`, ...).

2. **Automatic Dynamic Port Allocation**:
   - Scan for the first free port starting from `3000` for Vite.
   - Scan for the first free port starting from `4747` for Agentation.
   - Inject `VITE_AGENTATION_ENDPOINT=http://localhost:<mcpPort>` into Vite so the frontend toolbar connects specifically to its own worktree's MCP server.

3. **Per-Worktree State Tracking (`.worktree-servers.json`)**:
   - Each worktree persists its active server metadata (ports and PIDs) in `.worktree-servers.json` (which is git-ignored).
   - If servers are already running for *this* worktree, report their existing URLs without spawning duplicate processes.
   - If servers belong to *another* worktree, allocate new ports and run side-by-side without interference.

4. **Zero Production Footprint**:
   - `agentation` and `agentation-mcp` are strictly in `devDependencies`.
   - The `<DevAgentation />` component is conditionally loaded strictly when `import.meta.env.DEV` is true, ensuring 0 bytes leak into production bundles.

---

## 2. Server Management Workflows

### Primary Automated Orchestrator (`npm run servers`)

The fastest and safest way to manage servers across worktrees is using the built-in worktree orchestrator:

```bash
# Start or reuse isolated servers for the current worktree:
npm run servers

# Check current worktree server status:
npm run servers:status

# Stop current worktree servers:
npm run servers:stop
```

#### What `npm run servers` Does Under the Hood:
1. Detects the current worktree folder name (e.g. `add_agentation_toolbar`).
2. Checks `.worktree-servers.json` to see if servers are already active for this specific worktree. If healthy, outputs their active URLs.
3. If not running, finds the next available port for Vite (starting at 3000) and Agentation (starting at 4747).
4. Launches `agentation-mcp server --port <mcpPort>` as a daemon.
5. Launches `vite --port <vitePort> --host 0.0.0.0` with `VITE_AGENTATION_ENDPOINT=http://localhost:<mcpPort>`.
6. Saves state to `.worktree-servers.json` and outputs the isolated URLs and agent configuration.

---

## 3. Manual Step-by-Step Execution (Alternative)

If managing individual daemon processes manually via tool calls:

### Step 0: Find Free Ports for Current Worktree
```powershell
# PowerShell:
& { param(); function NextPort($p) { while (Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue) { $p++ }; $p }; "Vite: $(NextPort 3000) | Agentation: $(NextPort 4747)" }
```

### Step 1: Start Isolated Agentation MCP Server
Start Agentation on its allocated port:
```bash
npx agentation-mcp server --port <mcpPort>
```
*(Run with `IsDaemon: true`, `WaitMsBeforeAsync: 3000`).*

### Step 2: Start Isolated Vite Dev Server
Launch Vite pointing to that specific MCP port:
```powershell
# Windows PowerShell:
$env:VITE_AGENTATION_ENDPOINT="http://localhost:<mcpPort>"; npx vite --port <vitePort> --host 0.0.0.0
```
```bash
# macOS / Linux:
VITE_AGENTATION_ENDPOINT="http://localhost:<mcpPort>" npx vite --port <vitePort> --host 0.0.0.0
```
*(Run with `IsDaemon: true`, `WaitMsBeforeAsync: 4000`).*

---

## 4. Worktree Output & Reporting Dashboard

When servers are launched, provide a clear report customized to the current worktree:

```markdown
### 🚀 Worktree Dev Environment Active: `<worktree-name>`

| Service | Port & URL | Isolation Status |
| :--- | :--- | :--- |
| **Frontend App** | `http://localhost:<vitePort>` | Dedicated to branch `<branch>` |
| **Agentation MCP** | `http://localhost:<mcpPort>` | Dedicated to agent in this worktree |

---

### Connect AI Agent for This Worktree:
- **Claude Code**:
  `claude mcp add agentation-<worktree-name> -- npx -y agentation-mcp server --port <mcpPort>`
- **Cursor / VS Code**: Add to `.cursor/mcp.json` with args `["-y", "agentation-mcp", "server", "--port", "<mcpPort>"]`.
```
