import { tokenizeTextWithLinks } from './linkUtils';

/**
 * Escapes special HTML characters in plain text to prevent injection.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses inline Markdown formatting (bold, italic, inline code, and links)
 * into safe HTML snippet string.
 */
export function parseInlineMarkdownToHtml(line: string): string {
  if (!line) return '';

  // 1. Tokenize links first to prevent inner underscores/formatting from corrupting URLs
  const tokens = tokenizeTextWithLinks(line);

  return tokens
    .map((token) => {
      if (token.type === 'link' && token.url) {
        const escapedUrl = escapeHtml(token.url);
        const label = token.label
          ? escapeHtml(token.label)
          : escapeHtml(token.value);
        return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium cursor-pointer">${label}</a>`;
      }

      // 2. Format inline bold (**text**), italic (*text*), and code (`code`)
      let escaped = escapeHtml(token.value);

      // Bold: **text**
      escaped = escaped.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong class="font-semibold text-slate-800">$1</strong>'
      );

      // Italic: *text* (single asterisk)
      escaped = escaped.replace(
        /(^|[^*])\*([^*]+)\*(?!\*)/g,
        '$1<em class="italic text-slate-700">$2</em>'
      );

      // Inline code: `text`
      escaped = escaped.replace(
        /`([^`]+)`/g,
        '<code class="font-mono text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200">$1</code>'
      );

      return escaped;
    })
    .join('');
}

/**
 * Single source of truth for block styling across renderer AND editor
 * transforms. Sizes are tuned for card-width surfaces so WYSIWYG output
 * never looks oversized, and vertical rhythm comes exclusively from
 * explicit spacer paragraphs (mirroring stored "\n\n" one-to-one).
 */
export const BLOCK_STYLES = {
  h1: 'font-bold text-slate-900 text-lg font-sans tracking-tight mt-3 mb-1',
  h2: 'font-bold text-slate-900 text-base font-sans tracking-tight mt-2.5 mb-1',
  h3: 'font-bold text-slate-900 text-sm font-sans tracking-wide mt-2 mb-0.5',
  paragraph: 'leading-relaxed',
  bulletList: 'list-disc pl-4 space-y-0.5 my-1',
  numberedList: 'list-decimal pl-4 space-y-0.5 my-1',
  taskList: 'list-none pl-4 space-y-0.5 my-1',
  taskItem: 'task-item flex items-start gap-1.5 py-0.5',
  checkbox:
    "mt-0.5 w-3.5 h-3.5 shrink-0 rounded-[4px] border border-slate-300 bg-white cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 relative after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-[10px] after:leading-none after:content-['✓']",
  quote:
    'border-l-4 border-blue-400 bg-blue-50/60 rounded-lg pl-3 pr-2 py-1.5 my-2 text-slate-700',
  codeBlock:
    'my-2 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 selection:bg-blue-500/40',
  hr: 'my-3 border-slate-200',
} as const;

/** Thematic break (divider) syntax: --- / *** / ___ */
const HR_LINE_REGEX = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;

/**
 * Converts a standard Markdown string to rich HTML suitable for contentEditable rendering.
 *
 * Options:
 * - readOnly: renders interactive elements (checkboxes) inert for read-only contexts.
 */
export function markdownToHtml(
  markdown: string,
  options?: { readOnly?: boolean }
): string {
  if (!markdown || !markdown.trim()) {
    return '<p><br></p>';
  }

  const readOnly = options?.readOnly ?? false;
  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inUl = false;
  let inOl = false;
  let quoteBuffer: string[] | null = null;

  const closeOpenLists = () => {
    if (inUl) {
      htmlParts.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      htmlParts.push('</ol>');
      inOl = false;
    }
  };

  const flushQuote = () => {
    if (quoteBuffer && quoteBuffer.length > 0) {
      const inner = quoteBuffer
        .map((l) => parseInlineMarkdownToHtml(l))
        .join('<br>');
      htmlParts.push(`<blockquote class="${BLOCK_STYLES.quote}">${inner}</blockquote>`);
    }
    quoteBuffer = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block delimiter: ```
    if (line.trim().startsWith('```')) {
      flushQuote();
      closeOpenLists();
      if (inCodeBlock) {
        // Close code block
        const codeContent = codeBuffer.map(escapeHtml).join('\n');
        htmlParts.push(
          `<pre class="${BLOCK_STYLES.codeBlock}"><code>${codeContent}</code></pre>`
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        // Open code block
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Blank / Empty line -> explicit spacer (drives vertical rhythm 1:1 with stored \n\n)
    if (!line.trim()) {
      flushQuote();
      closeOpenLists();
      htmlParts.push('<p class="h-1.5" data-spacer="true"></p>');
      continue;
    }

    // Divider / thematic break: --- , *** , ___
    if (HR_LINE_REGEX.test(line)) {
      flushQuote();
      closeOpenLists();
      htmlParts.push(`<hr class="${BLOCK_STYLES.hr}" />`);
      continue;
    }

    // Quote/callout: group consecutive "> " lines into one blockquote
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeOpenLists();
      quoteBuffer = quoteBuffer || [];
      quoteBuffer.push(quoteMatch[1]);
      continue;
    }
    flushQuote();

    // Task list item: - [ ] / - [x]
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      if (inOl) {
        htmlParts.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push(`<ul class="${BLOCK_STYLES.taskList} text-slate-800 text-xs">`);
        inUl = true;
      }
      const checked = taskMatch[1].toLowerCase() === 'x';
      const content = parseInlineMarkdownToHtml(taskMatch[2]);
      htmlParts.push(
        `<li class="${BLOCK_STYLES.taskItem}${checked ? ' task-checked' : ''}" data-task="true" data-checked="${checked}">` +
          `<input type="checkbox"${checked ? ' checked' : ''}${readOnly ? ' disabled' : ''} data-task-checkbox="true" aria-label="Toggle task item" class="${BLOCK_STYLES.checkbox}" />` +
          `<span class="flex-1 task-text${checked ? ' line-through text-slate-400' : ''}">${content}</span>` +
          `</li>`
      );
      continue;
    }

    // Headings: H1, H2, H3
    if (line.startsWith('### ')) {
      closeOpenLists();
      const content = parseInlineMarkdownToHtml(line.slice(4));
      htmlParts.push(`<h4 class="${BLOCK_STYLES.h3}">${content}</h4>`);
      continue;
    }

    if (line.startsWith('## ')) {
      closeOpenLists();
      const content = parseInlineMarkdownToHtml(line.slice(3));
      htmlParts.push(`<h3 class="${BLOCK_STYLES.h2}">${content}</h3>`);
      continue;
    }

    if (line.startsWith('# ')) {
      closeOpenLists();
      const content = parseInlineMarkdownToHtml(line.slice(2));
      htmlParts.push(`<h2 class="${BLOCK_STYLES.h1}">${content}</h2>`);
      continue;
    }

    // Numbered List: 1. 2.
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      if (inUl) {
        htmlParts.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        htmlParts.push(`<ol class="${BLOCK_STYLES.numberedList} text-slate-800 text-xs">`);
        inOl = true;
      }
      const itemContent = parseInlineMarkdownToHtml(numberedMatch[2]);
      htmlParts.push(`<li class="leading-relaxed">${itemContent}</li>`);
      continue;
    }

    // Bullet List: - or *
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (inOl) {
        htmlParts.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push(`<ul class="${BLOCK_STYLES.bulletList} text-slate-800 text-xs">`);
        inUl = true;
      }
      const itemContent = parseInlineMarkdownToHtml(bulletMatch[1]);
      htmlParts.push(`<li class="leading-relaxed">${itemContent}</li>`);
      continue;
    }

    // Standard Paragraph (no self-margin — rhythm comes from spacers)
    closeOpenLists();
    const paraContent = parseInlineMarkdownToHtml(line);
    htmlParts.push(`<p class="${BLOCK_STYLES.paragraph}">${paraContent}</p>`);
  }

  flushQuote();
  closeOpenLists();

  if (inCodeBlock && codeBuffer.length > 0) {
    const codeContent = codeBuffer.map(escapeHtml).join('\n');
    htmlParts.push(
      `<pre class="${BLOCK_STYLES.codeBlock}"><code>${codeContent}</code></pre>`
    );
  }

  return htmlParts.join('');
}

/**
 * Traverses a DOM node recursively and serializes it into Markdown.
 * Block nodes return their content WITHOUT surrounding newlines —
 * block separation is handled exclusively by `serializeContainer`
 * (single source of truth for the "\n\n between blocks" law).
 */
export function domNodeToMarkdown(node: Node): string {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  const getChildrenMarkdown = () => {
    let result = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      result += domNodeToMarkdown(el.childNodes[i]);
    }
    return result;
  };

  switch (tag) {
    case 'h1':
    case 'h2': {
      const text = getChildrenMarkdown().trim();
      return text ? `# ${text}` : '';
    }
    case 'h3': {
      const text = getChildrenMarkdown().trim();
      return text ? `## ${text}` : '';
    }
    case 'h4':
    case 'h5':
    case 'h6': {
      const text = getChildrenMarkdown().trim();
      return text ? `### ${text}` : '';
    }
    case 'strong':
    case 'b': {
      const text = getChildrenMarkdown();
      return text ? `**${text}**` : '';
    }
    case 'em':
    case 'i': {
      const text = getChildrenMarkdown();
      return text ? `*${text}*` : '';
    }
    case 'input': {
      // Checkbox markers are represented by their parent task li, not inline
      return '';
    }
    case 'code': {
      // If parent is pre, the pre handler manages it
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        return el.textContent || '';
      }
      const text = el.textContent || '';
      return text ? `\`${text}\`` : '';
    }
    case 'pre': {
      const codeEl = el.querySelector('code');
      const text = (codeEl ? codeEl.textContent : el.textContent) || '';
      return `\`\`\`\n${text.trim()}\n\`\`\``;
    }
    case 'blockquote': {
      const inner = getChildrenMarkdown()
        .replace(/\n{2,}/g, '\n')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `> ${l}`)
        .join('\n');
      return inner;
    }
    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = getChildrenMarkdown().trim();
      if (!href) return text;
      if (!text || text === href) return href;
      return `[${text}](${href})`;
    }
    case 'li': {
      // Task items carry their own marker
      if (el.dataset.task === 'true') {
        const checked = el.dataset.checked === 'true';
        const textEl = el.querySelector('.task-text');
        const raw = textEl
          ? Array.from(textEl.childNodes)
              .map((c) => domNodeToMarkdown(c))
              .join('')
          : el.textContent || '';
        return `- [${checked ? 'x' : ' '}] ${raw.trim()}`;
      }
      return getChildrenMarkdown().replace(/\n{2,}/g, '\n').trim();
    }
    case 'ul': {
      const items = Array.from(el.children).filter(
        (c) => c.tagName.toLowerCase() === 'li'
      );
      return items
        .map((li) => {
          const t = domNodeToMarkdown(li).replace(/\n{2,}/g, '\n').trim();
          return t.startsWith('- [') ? t : `- ${t}`;
        })
        .filter(Boolean)
        .join('\n');
    }
    case 'ol': {
      const items = Array.from(el.children).filter(
        (c) => c.tagName.toLowerCase() === 'li'
      );
      return items
        .map((li, idx) => {
          const t = domNodeToMarkdown(li).replace(/\n{2,}/g, '\n').trim();
          return `${idx + 1}. ${t}`;
        })
        .filter(Boolean)
        .join('\n');
    }
    case 'p':
    case 'div': {
      const inner = getChildrenMarkdown();
      if (!inner.trim() || el.innerHTML === '<br>' || el.innerHTML === '<br/>') {
        return '';
      }
      return inner.trim();
    }
    case 'br': {
      return '\n';
    }
    case 'hr': {
      return '---';
    }
    default: {
      return getChildrenMarkdown();
    }
  }
}

/**
 * Serializes a container element's children as canonical Markdown blocks
 * separated by exactly one blank line ("\\n\\n"). This is the single place
 * where block separation is decided, guaranteeing round-trip stability.
 */
function serializeContainer(root: HTMLElement): string {
  // A bare list passed as the root is itself one block
  const rootTag = root.tagName.toLowerCase();
  if (rootTag === 'ul' || rootTag === 'ol' || rootTag === 'pre' || rootTag === 'blockquote') {
    const only = domNodeToMarkdown(root).replace(/\n{3,}/g, '\n\n').trim();
    return only;
  }
  const blocks: string[] = [];
  for (let i = 0; i < root.childNodes.length; i++) {
    const raw = domNodeToMarkdown(root.childNodes[i]);
    const cleaned = raw.replace(/\n{3,}/g, '\n\n').trim();
    if (cleaned) blocks.push(cleaned);
  }
  return blocks.join('\n\n');
}

/**
 * Converts rich HTML (or an HTML element / string) back into clean,
 * canonical Markdown: one blank line between blocks, collapsed excess
 * newlines, trimmed outer whitespace. Idempotent by construction —
 * canonicalize(canonicalize(x)) === canonicalize(x).
 */
export function htmlToMarkdown(htmlOrNode: string | HTMLElement): string {
  if (!htmlOrNode) return '';

  let rootNode: HTMLElement;

  if (typeof htmlOrNode === 'string') {
    if (typeof document !== 'undefined') {
      const container = document.createElement('div');
      container.innerHTML = htmlOrNode;
      rootNode = container;
    } else {
      // Fallback if running in non-DOM environment
      return htmlOrNode;
    }
  } else {
    rootNode = htmlOrNode;
  }

  const markdown = serializeContainer(rootNode)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}

/**
 * True when `node` sits inside a fenced code block (`pre`), where inline
 * formatting actions and interactive checkboxes must not apply.
 */
export function isInsideCodeFence(node: Node): boolean {
  if (!node) return false;
  const el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  return !!el && !!el.closest('pre');
}

/**
 * Flips a task item's checked state (data attribute + visual strike-through).
 * Mutates ONLY the target item — siblings untouched. Caller re-serializes.
 */
export function toggleTaskItem(itemEl: HTMLElement): void {
  if (itemEl.dataset.task !== 'true') return;
  const nowChecked = itemEl.dataset.checked !== 'true';
  itemEl.dataset.checked = nowChecked ? 'true' : 'false';
  const input = itemEl.querySelector<HTMLInputElement>('input[data-task-checkbox]');
  if (input) {
    input.checked = nowChecked;
    // Mirror the attribute so styling/serialization can never desync
    if (nowChecked) input.setAttribute('checked', '');
    else input.removeAttribute('checked');
  }
  const text = itemEl.querySelector<HTMLElement>('.task-text');
  if (text) text.classList.toggle('line-through', nowChecked);
  if (text) text.classList.toggle('text-slate-400', nowChecked);
}

/**
 * Creates the next unchecked task item after `itemEl` (Enter-at-end
 * continuation, FR-010 extension). Returns the new item.
 */
export function spawnNextTaskItem(itemEl: HTMLElement): HTMLElement {
  const next = makeTaskItemElement('', false);
  itemEl.parentElement?.insertBefore(next, itemEl.nextSibling);
  return next;
}

function makeTaskItemElement(text: string, checked: boolean): HTMLElement {
  const li = document.createElement('li');
  li.className = BLOCK_STYLES.taskItem;
  li.dataset.task = 'true';
  li.dataset.checked = checked ? 'true' : 'false';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.setAttribute('data-task-checkbox', 'true');
  input.setAttribute('aria-label', 'Toggle task item');
  input.className = BLOCK_STYLES.checkbox;

  const span = document.createElement('span');
  span.className = 'flex-1 task-text';
  span.textContent = text;

  li.appendChild(input);
  li.appendChild(span);
  return li;
}

/**
 * Canonical form of a Markdown string: what the note looks like after one
 * render → serialize cycle. Stored/saved notes converge to this form.
 */
export function canonicalizeMarkdown(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';
  return htmlToMarkdown(markdownToHtml(markdown));
}

/**
 * Equality under canonicalization: true when two Markdown strings render
 * identically. Used by the editor sync layer to skip no-op DOM writes
 * (caret preservation) and by save-compare logic to avoid phantom diffs.
 */
export function compareCanonical(a: string, b: string): boolean {
  if (a === b) return true;
  return canonicalizeMarkdown(a) === canonicalizeMarkdown(b);
}
