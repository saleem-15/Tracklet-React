#!/usr/bin/env node

/**
 * create-pr.cjs
 * Cross-platform script to create or open a pre-filled GitHub Pull Request.
 *
 * Usage:
 *   node .agents/skills/pr/scripts/create-pr.cjs --title "..." --body-file ".git/pr-description.md"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getArg(flag, defaultValue = null) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return defaultValue;
}

const hasFlag = (flag) => process.argv.includes(flag);

const title = getArg('--title');
const bodyArg = getArg('--body');
const bodyFile = getArg('--body-file');
const base = getArg('--base', 'main');
const noBrowser = hasFlag('--no-browser');

if (!title) {
  console.error('[Ship Skill] Error: --title is required.');
  process.exit(1);
}

let body = bodyArg;
if (bodyFile) {
  if (!fs.existsSync(bodyFile)) {
    console.error(`[Ship Skill] Error: Body file not found: ${bodyFile}`);
    process.exit(1);
  }
  body = fs.readFileSync(bodyFile, 'utf8');
}

if (!body) {
  console.error('[Ship Skill] Error: Either --body or --body-file is required.');
  process.exit(1);
}

// 1. Detect remote and current branch
let remoteUrl = '';
let branch = '';
try {
  remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
} catch (err) {
  console.error('[Ship Skill] Error: Must be executed within a valid git repository with an origin remote.');
  process.exit(1);
}

const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
if (!match) {
  console.error(`[Ship Skill] Error: Remote URL '${remoteUrl}' is not a recognized GitHub URL.`);
  process.exit(1);
}
const ownerRepo = match[1];

if (branch === base) {
  console.error(`[Ship Skill] Error: Cannot create a pull request from '${branch}' into itself.`);
  process.exit(1);
}

// 2. Check if GitHub CLI is installed and authenticated
let hasGh = false;
try {
  execSync('gh auth status', { stdio: 'ignore' });
  hasGh = true;
} catch {
  hasGh = false;
}

if (hasGh) {
  console.log('[Ship Skill] GitHub CLI (gh) detected and authenticated.');
  console.log('[Ship Skill] Creating Pull Request directly via API...');
  const tempFile = path.join(os.tmpdir(), `pr-body-${Date.now()}.md`);
  try {
    fs.writeFileSync(tempFile, body, 'utf8');
    const prUrl = execSync(
      `gh pr create --base "${base}" --head "${branch}" --title "${title.replace(/"/g, '\\"')}" --body-file "${tempFile}"`,
      { encoding: 'utf8' }
    ).trim();
    console.log(`[Ship Skill] Pull Request created successfully:\n${prUrl}`);
    fs.unlinkSync(tempFile);
    process.exit(0);
  } catch (err) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    console.warn('[Ship Skill] gh pr create failed. Falling back to pre-filled GitHub URL...');
  }
}

// 3. Fallback: Pre-filled GitHub Compare URL
const encodedTitle = encodeURIComponent(title);
const encodedBody = encodeURIComponent(body);
const compareUrl = `https://github.com/${ownerRepo}/compare/${base}...${branch}?expand=1&title=${encodedTitle}&body=${encodedBody}`;

console.log(`[Ship Skill] Pre-filled Pull Request URL generated:\n${compareUrl}`);

if (!noBrowser) {
  console.log('[Ship Skill] Opening GitHub in your browser with Title and Description already filled in...');
  const openCmd =
    process.platform === 'win32'
      ? `start "" "${compareUrl.replace(/&/g, '^&')}"`
      : process.platform === 'darwin'
      ? `open "${compareUrl}"`
      : `xdg-open "${compareUrl}"`;

  try {
    execSync(openCmd, { shell: true, stdio: 'ignore' });
  } catch {
    // browser launch failure is non-fatal
  }
}
