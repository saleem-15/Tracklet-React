#!/usr/bin/env node
/**
 * Tracklet / Antigravity Context Window Inspector
 * Usage:
 *   node scripts/check-context.js               # Inspects the most recently active chat
 *   node scripts/check-context.js <conv-id>     # Inspects a specific conversation by ID
 *   node scripts/check-context.js --all         # Lists recent chats and their token usage
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

const CONTEXT_LIMIT = 1_000_000; // Gemini 1M token context window default
const BRAIN_DIR = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function renderBar(ratio, width = 24) {
  const filled = Math.min(width, Math.max(0, Math.round(ratio * width)));
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function getLastPlannerTokens(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) return null;

  const fileStream = fs.createReadStream(transcriptPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lastPlanner = null;

  for await (const line of rl) {
    if (!line.includes('"PLANNER_RESPONSE"')) continue;
    try {
      const data = JSON.parse(line);
      if (data.type === 'PLANNER_RESPONSE' && (data.input_tokens !== undefined || data.cache_read_tokens !== undefined)) {
        lastPlanner = data;
      }
    } catch {}
  }

  return lastPlanner;
}

function getConversationDirectories() {
  if (!fs.existsSync(BRAIN_DIR)) return [];
  const entries = fs.readdirSync(BRAIN_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => {
      const convDir = path.join(BRAIN_DIR, e.name);
      const logPath = path.join(convDir, '.system_generated', 'logs', 'transcript.jsonl');
      let mtime = 0;
      let exists = false;
      if (fs.existsSync(logPath)) {
        exists = true;
        mtime = fs.statSync(logPath).mtimeMs;
      }
      return { id: e.name, logPath, mtime, exists };
    })
    .filter((e) => e.exists)
    .sort((a, b) => b.mtime - a.mtime);
}

async function inspectConversation(conv) {
  const data = await getLastPlannerTokens(conv.logPath);
  if (!data) return null;

  const inputTokens = data.input_tokens || 0;
  const cachedTokens = data.cache_read_tokens || 0;
  const outputTokens = data.output_tokens || 0;
  const totalContext = inputTokens + cachedTokens;
  const usageRatio = totalContext / CONTEXT_LIMIT;
  const usagePct = (usageRatio * 100).toFixed(1);

  return {
    id: conv.id,
    mtime: new Date(conv.mtime),
    stepIndex: data.step_index,
    inputTokens,
    cachedTokens,
    outputTokens,
    totalContext,
    usageRatio,
    usagePct,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes('--all') || args.includes('-a');
  const targetId = args.find((a) => !a.startsWith('-'));

  const convs = getConversationDirectories();
  if (convs.length === 0) {
    console.error(`\x1b[31mNo Antigravity conversation logs found in: ${BRAIN_DIR}\x1b[0m`);
    process.exit(1);
  }

  if (showAll) {
    console.log(`\n\x1b[1m\x1b[36m=== Antigravity Conversations Context Summary ===\x1b[0m`);
    console.log(`Found ${convs.length} total logged sessions (showing latest 10):\n`);

    const topConvs = convs.slice(0, 10);
    const results = [];
    for (const c of topConvs) {
      const info = await inspectConversation(c);
      if (info) results.push(info);
    }

    for (const r of results) {
      const color = r.usageRatio > 0.7 ? '\x1b[31m' : r.usageRatio > 0.4 ? '\x1b[33m' : '\x1b[32m';
      console.log(
        `  ${r.id.slice(0, 8)}...  [${color}${renderBar(r.usageRatio, 16)}\x1b[0m]  ${r.usagePct.padStart(5)}%  ` +
        `(${formatNumber(r.totalContext).padStart(8)} tokens)  ·  ${r.mtime.toLocaleDateString()} ${r.mtime.toLocaleTimeString()}`
      );
    }
    console.log(`\nTip: Run with conversation ID to see detailed breakdown: \x1b[33mnode scripts/check-context.js <conv-id>\x1b[0m\n`);
    return;
  }

  let selectedConv = convs[0];
  if (targetId) {
    const matched = convs.find((c) => c.id.toLowerCase().startsWith(targetId.toLowerCase()));
    if (!matched) {
      console.error(`\x1b[31mConversation ID starting with "${targetId}" not found.\x1b[0m`);
      process.exit(1);
    }
    selectedConv = matched;
  }

  const info = await inspectConversation(selectedConv);
  if (!info) {
    console.error(`\x1b[31mNo tokens recorded yet in conversation ${selectedConv.id}.\x1b[0m`);
    process.exit(1);
  }

  const color = info.usageRatio > 0.7 ? '\x1b[31m' : info.usageRatio > 0.4 ? '\x1b[33m' : '\x1b[32m';
  const statusLabel =
    info.usageRatio > 0.75
      ? '🔴 High context usage (Consider /compact)'
      : info.usageRatio > 0.4
      ? '🟡 Moderate context usage'
      : '🟢 Healthy context headroom';

  console.log(`\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m║               Antigravity Chat Context Inspector                 ║\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════════╝\x1b[0m\n`);

  console.log(`  \x1b[1mConversation ID:\x1b[0m     \x1b[33m${info.id}\x1b[0m`);
  console.log(`  \x1b[1mLast Activity:\x1b[0m       ${info.mtime.toLocaleString()}`);
  console.log(`  \x1b[1mStatus:\x1b[0m              ${statusLabel}\n`);

  console.log(`  \x1b[1mContext Utilization (Gemini 1M Window):\x1b[0m`);
  console.log(`  [${color}${renderBar(info.usageRatio, 32)}\x1b[0m] \x1b[1m${info.usagePct}%\x1b[0m (${formatNumber(info.totalContext)} / 1,000,000 tokens)\n`);

  console.log(`  \x1b[1mDetailed Breakdown:\x1b[0m`);
  console.log(`    ├─ Cached Context (Prompt Cache):   \x1b[32m${formatNumber(info.cachedTokens).padStart(9)} tokens\x1b[0m`);
  console.log(`    ├─ New Turn Input & State:          \x1b[34m${formatNumber(info.inputTokens).padStart(9)} tokens\x1b[0m`);
  console.log(`    ├─ Last Assistant Response:         \x1b[35m${formatNumber(info.outputTokens).padStart(9)} tokens\x1b[0m`);
  console.log(`    └─ Remaining Headroom:              \x1b[37m${formatNumber(CONTEXT_LIMIT - info.totalContext).padStart(9)} tokens\x1b[0m\n`);

  if (info.usageRatio > 0.7) {
    console.log(`  \x1b[33m💡 Tip: Type \x1b[1m/compact\x1b[0m\x1b[33m in chat to summarize past turns and free up space.\x1b[0m\n`);
  }
}

main().catch((err) => {
  console.error('Error checking context:', err);
  process.exit(1);
});
