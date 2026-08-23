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
        '<strong class="font-bold text-slate-900">$1</strong>'
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
 * Converts a standard Markdown string to rich HTML suitable for contentEditable rendering.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '<p><br></p>';
  }

  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inUl = false;
  let inOl = false;

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block delimiter: ```
    if (line.trim().startsWith('```')) {
      closeOpenLists();
      if (inCodeBlock) {
        // Close code block
        const codeContent = codeBuffer.map(escapeHtml).join('\n');
        htmlParts.push(
          `<pre class="my-2.5 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 selection:bg-blue-500/40"><code>${codeContent}</code></pre>`
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

    // Blank / Empty line
    if (!line.trim()) {
      closeOpenLists();
      htmlParts.push('<p><br></p>');
      continue;
    }

    // Headings: H1, H2, H3
    if (line.startsWith('### ')) {
      closeOpenLists();
      const content = parseInlineMarkdownToHtml(line.slice(4));
      htmlParts.push(
        `<h4 class="font-bold text-blue-700 text-xs font-mono uppercase tracking-wide mt-3 mb-1">${content}</h4>`
      );
      continue;
    }

    if (line.startsWith('## ')) {
      closeOpenLists();
      const content = parseInlineMarkdownToHtml(line.slice(3));
      htmlParts.push(
        `<h3 class="font-bold text-slate-900 text-sm font-sans tracking-tight mt-3 mb-1">${content}</h3>`
      );
      continue;
    }

    if (line.startsWith('# ')) {
      closeOpenLists();
      const content = parseInlineMarkdownToHtml(line.slice(2));
      htmlParts.push(
        `<h2 class="font-bold text-slate-900 text-base font-sans tracking-tight mt-3.5 mb-1.5 border-b border-slate-200/80 pb-1">${content}</h2>`
      );
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
        htmlParts.push('<ol class="list-decimal pl-5 space-y-0.5 my-1 text-slate-800 text-xs">');
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
        htmlParts.push('<ul class="list-disc pl-5 space-y-0.5 my-1 text-slate-800 text-xs">');
        inUl = true;
      }
      const itemContent = parseInlineMarkdownToHtml(bulletMatch[1]);
      htmlParts.push(`<li class="leading-relaxed">${itemContent}</li>`);
      continue;
    }

    // Standard Paragraph
    closeOpenLists();
    const paraContent = parseInlineMarkdownToHtml(line);
    htmlParts.push(`<p class="text-slate-800 text-xs leading-relaxed my-1">${paraContent}</p>`);
  }

  closeOpenLists();

  if (inCodeBlock && codeBuffer.length > 0) {
    const codeContent = codeBuffer.map(escapeHtml).join('\n');
    htmlParts.push(
      `<pre class="my-2.5 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 selection:bg-blue-500/40"><code>${codeContent}</code></pre>`
    );
  }

  return htmlParts.join('');
}

/**
 * Traverses a DOM node recursively and serializes it back into clean Markdown.
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
    case 'h1': {
      const text = getChildrenMarkdown().trim();
      return text ? `# ${text}\n\n` : '';
    }
    case 'h2': {
      const text = getChildrenMarkdown().trim();
      return text ? `## ${text}\n\n` : '';
    }
    case 'h3': {
      const text = getChildrenMarkdown().trim();
      return text ? `## ${text}\n\n` : '';
    }
    case 'h4':
    case 'h5':
    case 'h6': {
      const text = getChildrenMarkdown().trim();
      return text ? `### ${text}\n\n` : '';
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
      return `\n\`\`\`\n${text.trim()}\n\`\`\`\n\n`;
    }
    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = getChildrenMarkdown().trim();
      if (!href) return text;
      if (!text || text === href) return href;
      return `[${text}](${href})`;
    }
    case 'ul': {
      let ulContent = '';
      const listItems = Array.from(el.children).filter(
        (c) => c.tagName.toLowerCase() === 'li'
      );
      for (const li of listItems) {
        let liText = '';
        for (let i = 0; i < li.childNodes.length; i++) {
          liText += domNodeToMarkdown(li.childNodes[i]);
        }
        ulContent += `- ${liText.trim()}\n`;
      }
      return `${ulContent}\n`;
    }
    case 'ol': {
      let olContent = '';
      const listItems = Array.from(el.children).filter(
        (c) => c.tagName.toLowerCase() === 'li'
      );
      for (let i = 0; i < listItems.length; i++) {
        const li = listItems[i];
        let liText = '';
        for (let j = 0; j < li.childNodes.length; j++) {
          liText += domNodeToMarkdown(li.childNodes[j]);
        }
        olContent += `${i + 1}. ${liText.trim()}\n`;
      }
      return `${olContent}\n`;
    }
    case 'li': {
      return getChildrenMarkdown();
    }
    case 'p':
    case 'div': {
      const inner = getChildrenMarkdown();
      if (!inner || inner === '\n' || el.innerHTML === '<br>') {
        return '\n';
      }
      return `${inner}\n\n`;
    }
    case 'br': {
      return '\n';
    }
    default: {
      return getChildrenMarkdown();
    }
  }
}

/**
 * Converts rich HTML (or an HTML element / string) back into clean Markdown.
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

  let markdown = domNodeToMarkdown(rootNode);

  // Normalize duplicate newlines (3+ newlines to double newline) and trim outer margins
  markdown = markdown
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}
