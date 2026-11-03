/**
 * Multi-Worktree Server Manager for Tracklet & Agentation
 *
 * Ensures 100% isolation across concurrent Git worktrees:
 * - Each worktree receives its own unique Vite port (3000, 3001, 3002...)
 * - Each worktree receives its own unique Agentation MCP port (4747, 4748, 4749...)
 * - Vite automatically receives VITE_AGENTATION_ENDPOINT pointing to its own worktree's MCP server
 * - State is persisted locally in `.worktree-servers.json` (git-ignored)
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const { spawn } = require('child_process');

const WORKTREE_ROOT = process.cwd();
const STATE_FILE = path.join(WORKTREE_ROOT, '.worktree-servers.json');
const WORKTREE_NAME = path.basename(WORKTREE_ROOT);

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function getNextFreePort(startPort, maxAttempts = 50) {
  let port = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortFree(port)) {
      return port;
    }
    port++;
  }
  throw new Error(`Could not find a free port starting from ${startPort} (checked up to ${port})`);
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function probeHttp(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = http.request(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname || '/',
          method: 'GET',
          timeout: timeoutMs,
        },
        (res) => {
          resolve(true);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(data) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function removeState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      fs.unlinkSync(STATE_FILE);
    } catch {}
  }
}

async function getStatus() {
  const state = readState();
  if (!state) {
    return { running: false, message: 'No server state recorded for this worktree.' };
  }

  const viteAlive = isPidAlive(state.vitePid) && !(await isPortFree(state.vitePort));
  const mcpAlive = isPidAlive(state.mcpPid) && !(await isPortFree(state.mcpPort));

  if (!viteAlive && !mcpAlive) {
    removeState();
    return { running: false, message: 'Previous servers are no longer running.' };
  }

  return {
    running: true,
    worktree: state.worktree || WORKTREE_NAME,
    vitePort: state.vitePort,
    mcpPort: state.mcpPort,
    vitePid: state.vitePid,
    mcpPid: state.mcpPid,
    viteUrl: `http://localhost:${state.vitePort}`,
    mcpUrl: `http://localhost:${state.mcpPort}`,
    startedAt: state.startedAt,
    viteHealthy: viteAlive,
    mcpHealthy: mcpAlive,
  };
}

async function stopServers() {
  const state = readState();
  if (!state) {
    console.log(`[Multi-Worktree] No recorded servers found for worktree "${WORKTREE_NAME}".`);
    return;
  }

  let killed = 0;
  if (state.vitePid && isPidAlive(state.vitePid)) {
    try {
      process.kill(state.vitePid);
      killed++;
    } catch {}
  }
  if (state.mcpPid && isPidAlive(state.mcpPid)) {
    try {
      process.kill(state.mcpPid);
      killed++;
    } catch {}
  }

  removeState();
  console.log(`[Multi-Worktree] Stopped servers for worktree "${WORKTREE_NAME}" (killed ${killed} processes).`);
}

async function startServers() {
  const existing = await getStatus();
  if (existing.running && existing.viteHealthy && existing.mcpHealthy) {
    console.log(`\n================================================================`);
    console.log(`[Multi-Worktree] Servers ALREADY running for "${WORKTREE_NAME}":`);
    console.log(`  Frontend App:   ${existing.viteUrl}`);
    console.log(`  Agentation MCP: ${existing.mcpUrl}`);
    console.log(`================================================================\n`);
    return existing;
  }

  console.log(`[Multi-Worktree] Allocating isolated ports for worktree "${WORKTREE_NAME}"...`);

  const vitePort = await getNextFreePort(3000);
  const mcpPort = await getNextFreePort(4747);

  console.log(`[Multi-Worktree] Reserved ports: Vite -> ${vitePort}, Agentation MCP -> ${mcpPort}`);

  // 1. Launch Agentation MCP Server
  const mcpArgs = ['agentation-mcp', 'server', '--port', String(mcpPort)];
  const mcpProcess = spawn('npx', mcpArgs, {
    cwd: WORKTREE_ROOT,
    stdio: 'ignore',
    detached: true,
    shell: true,
  });
  mcpProcess.unref();

  // 2. Launch Vite Dev Server
  const viteEnv = {
    ...process.env,
    VITE_AGENTATION_ENDPOINT: `http://localhost:${mcpPort}`,
  };

  const viteArgs = ['vite', '--port', String(vitePort), '--host', '0.0.0.0'];
  const viteProcess = spawn('npx', viteArgs, {
    cwd: WORKTREE_ROOT,
    env: viteEnv,
    stdio: 'ignore',
    detached: true,
    shell: true,
  });
  viteProcess.unref();

  const stateData = {
    worktree: WORKTREE_NAME,
    worktreePath: WORKTREE_ROOT,
    vitePort,
    mcpPort,
    vitePid: viteProcess.pid,
    mcpPid: mcpProcess.pid,
    viteUrl: `http://localhost:${vitePort}`,
    mcpUrl: `http://localhost:${mcpPort}`,
    startedAt: new Date().toISOString(),
  };

  writeState(stateData);

  // Allow servers 1.5s to bind
  await new Promise((r) => setTimeout(r, 1500));

  console.log(`\n================================================================`);
  console.log(`🚀 [Multi-Worktree] Isolated Servers Launched for "${WORKTREE_NAME}"!`);
  console.log(`----------------------------------------------------------------`);
  console.log(`  Frontend App:     http://localhost:${vitePort}`);
  console.log(`  Agentation Sync:  http://localhost:${mcpPort}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`  AI Agent MCP Config for this Worktree:`);
  console.log(`  claude mcp add agentation-${WORKTREE_NAME} -- npx -y agentation-mcp server --port ${mcpPort}`);
  console.log(`================================================================\n`);

  return stateData;
}

async function main() {
  const action = process.argv[2] || 'start';

  if (action === 'status') {
    const status = await getStatus();
    console.log(JSON.stringify(status, null, 2));
  } else if (action === 'stop') {
    await stopServers();
  } else if (action === 'start') {
    await startServers();
  } else {
    console.log(`Usage: node manage-worktree-servers.cjs [start|stop|status]`);
  }
}

main().catch((err) => {
  console.error('[Multi-Worktree Error]', err);
  process.exit(1);
});
