import { isInsideCodeFence, LINK_CLASS } from './richTextMarkdownUtils';
import { normalizeUrl } from '../linkUtils';

export interface InlinePatternMatch {
  type:
    | 'bold'
    | 'bold-underscore'
    | 'italic-asterisk'
    | 'italic-underscore'
    | 'code'
    | 'strike'
    | 'link';
  fullMatch: string;
  innerContent: string;
  url?: string;
  trailingSpace?: boolean;
}

/**
 * Checks if the text immediately preceding the caret matches an inline Markdown pattern.
 */
export function matchInlineMarkdown(textBeforeCaret: string): InlinePatternMatch | null {
  // 1. Inline code: `code`
  const codeMatch = textBeforeCaret.match(/(?:^|[^`])`([^`\n]+)`$/);
  if (codeMatch) {
    const raw = codeMatch[0].startsWith('`') ? codeMatch[0] : codeMatch[0].slice(1);
    return {
      type: 'code',
      fullMatch: raw,
      innerContent: codeMatch[1],
    };
  }

  // 2. Bold (asterisks): **bold**
  const boldMatch = textBeforeCaret.match(/(?:^|[^*])\*\*([^*\n]+)\*\*$/);
  if (boldMatch) {
    const raw = boldMatch[0].startsWith('**') ? boldMatch[0] : boldMatch[0].slice(1);
    return {
      type: 'bold',
      fullMatch: raw,
      innerContent: boldMatch[1],
    };
  }

  // 3. Bold (underscores): __bold__
  const boldUnderMatch = textBeforeCaret.match(/(?:^|[^_])__([^_\n]+)__$/);
  if (boldUnderMatch) {
    const raw = boldUnderMatch[0].startsWith('__') ? boldUnderMatch[0] : boldUnderMatch[0].slice(1);
    return {
      type: 'bold-underscore',
      fullMatch: raw,
      innerContent: boldUnderMatch[1],
    };
  }

  // 4. Strikethrough: ~~strikethrough~~
  const strikeMatch = textBeforeCaret.match(/(?:^|[^~])~~([^~\n]+)~~$/);
  if (strikeMatch) {
    const raw = strikeMatch[0].startsWith('~~') ? strikeMatch[0] : strikeMatch[0].slice(1);
    return {
      type: 'strike',
      fullMatch: raw,
      innerContent: strikeMatch[1],
    };
  }

  // 5. Markdown Link: [label](url)
  const linkMatch = textBeforeCaret.match(
    /(?:^|[^!])\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)$/
  );
  if (linkMatch) {
    const raw = linkMatch[0].startsWith('[') ? linkMatch[0] : linkMatch[0].slice(1);
    return {
      type: 'link',
      fullMatch: raw,
      innerContent: linkMatch[1],
      url: linkMatch[2],
    };
  }

  // 6. Italic (asterisk with space trigger): *italic text* 
  const italicMatch = textBeforeCaret.match(/(?:^|[^*])\*([^*\n\s](?:[^*\n]*[^*\n\s])?)\*\s$/);
  if (italicMatch) {
    const raw = italicMatch[0].startsWith('*') ? italicMatch[0] : italicMatch[0].slice(1);
    return {
      type: 'italic-asterisk',
      fullMatch: raw,
      innerContent: italicMatch[1],
      trailingSpace: true,
    };
  }

  // 7. Italic (underscore with space trigger): _italic text_ 
  const italicUnderMatch = textBeforeCaret.match(/(?:^|[^_])_([^_\n\s](?:[^_\n]*[^_\n\s])?)_\s$/);
  if (italicUnderMatch) {
    const raw = italicUnderMatch[0].startsWith('_') ? italicUnderMatch[0] : italicUnderMatch[0].slice(1);
    return {
      type: 'italic-underscore',
      fullMatch: raw,
      innerContent: italicUnderMatch[1],
      trailingSpace: true,
    };
  }

  return null;
}

/**
 * Attempts to transform the markdown text directly before the caret into styled rich DOM.
 * Returns true if a transformation occurred.
 */
export function tryApplyInlineMarkdown(
  editor: HTMLElement,
  selection: Selection
): boolean {
  if (!selection.isCollapsed || selection.rangeCount === 0) return false;
  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editor.contains(anchorNode)) return false;
  if (isInsideCodeFence(anchorNode)) return false;

  // We operate on text nodes
  if (anchorNode.nodeType !== Node.TEXT_NODE) return false;
  const textNode = anchorNode as Text;
  const caretOffset = selection.anchorOffset;
  const textBeforeCaret = (textNode.nodeValue ?? '').slice(0, caretOffset);
  if (!textBeforeCaret) return false;

  const match = matchInlineMarkdown(textBeforeCaret);
  if (!match) return false;

  const matchLen = match.fullMatch.length;
  const startIndex = caretOffset - matchLen;
  if (startIndex < 0) return false;

  // Split text node around the match
  // 1. Text node before the match (if startIndex > 0)
  const targetNode = startIndex > 0 ? textNode.splitText(startIndex) : textNode;
  // 2. Text node after the match
  const remainingNode = targetNode.splitText(matchLen);

  // Create the rich element
  let richEl: HTMLElement;
  switch (match.type) {
    case 'bold':
    case 'bold-underscore': {
      richEl = document.createElement('strong');
      richEl.className = 'font-semibold text-slate-800';
      richEl.textContent = match.innerContent;
      break;
    }
    case 'code': {
      richEl = document.createElement('code');
      richEl.className =
        'font-mono text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200';
      richEl.textContent = match.innerContent;
      break;
    }
    case 'strike': {
      richEl = document.createElement('s');
      richEl.className = 'line-through text-slate-400';
      richEl.textContent = match.innerContent;
      break;
    }
    case 'link': {
      const a = document.createElement('a');
      a.className = LINK_CLASS;
      a.href = normalizeUrl(match.url ?? '');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = match.innerContent;
      richEl = a;
      break;
    }
    case 'italic-asterisk':
    case 'italic-underscore': {
      richEl = document.createElement('em');
      richEl.className = 'italic text-slate-700';
      richEl.textContent = match.innerContent;
      break;
    }
  }

  // Drop in the rich element
  targetNode.replaceWith(richEl);

  // Position caret right after richEl
  let caretTargetNode: Node;
  let caretTargetOffset = 0;

  if (remainingNode && remainingNode.nodeValue && remainingNode.nodeValue.length > 0) {
    caretTargetNode = remainingNode;
    caretTargetOffset = 0;
  } else {
    // Insert a zero-width space or space so the caret has a clean anchor outside the formatting tag
    const padChar = match.trailingSpace ? ' ' : '\u200B';
    const trailingPad = document.createTextNode(padChar);
    richEl.parentNode?.insertBefore(trailingPad, richEl.nextSibling);
    caretTargetNode = trailingPad;
    caretTargetOffset = trailingPad.length;
  }

  const newRange = document.createRange();
  newRange.setStart(caretTargetNode, caretTargetOffset);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);

  return true;
}
