/**
 * Pure utility functions for detecting, parsing, and tokenizing links within notes & text.
 */

export interface ExtractedLink {
  url: string;
  label: string;
  isMarkdown?: boolean;
}

export interface LinkToken {
  type: 'text' | 'link';
  value: string;
  url?: string;
  label?: string;
}

/**
 * Normalizes a URL to ensure it has a valid protocol.
 * E.g., "www.github.com" -> "https://www.github.com"
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Formats a URL into a clean, human-readable display label.
 * E.g., "https://github.com/facebook/react/issues/1234" -> "github.com/facebook/react..."
 */
export function formatUrlLabel(url: string, maxLength: number = 36): string {
  if (!url) return '';
  let clean = url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  // Remove trailing slashes
  clean = clean.replace(/\/+$/, '');

  if (clean.length <= maxLength) {
    return clean;
  }

  return clean.slice(0, maxLength - 3) + '…';
}

/**
 * Regex for Markdown links: [Link Label](https://example.com or www.example.com)
 */
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s\)]+)\)/g;

/**
 * Regex for standard URLs (http://, https://, or www.)
 */
const RAW_URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>[\]"'\(\)]+(?:\([^\s<>[\]"'\)]*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’])+/g;

/**
 * Trims trailing punctuation like '.', ',', ';', '!', ')' if not balanced.
 */
function cleanRawUrl(url: string): string {
  let cleaned = url;
  while (/[.,;:!?]$/.test(cleaned)) {
    cleaned = cleaned.slice(0, -1);
  }
  // If ending with ')' and there is no '(' in the URL, strip it
  if (cleaned.endsWith(')') && !cleaned.includes('(')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

/**
 * Extracts all unique URLs / Markdown links from a text block.
 */
export function extractLinks(text?: string | null): ExtractedLink[] {
  if (!text || typeof text !== 'string') return [];

  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  // 1. Extract markdown links first
  let mdMatch: RegExpExecArray | null;
  const mdRegex = new RegExp(MARKDOWN_LINK_REGEX);
  while ((mdMatch = mdRegex.exec(text)) !== null) {
    const rawLabel = mdMatch[1];
    const rawUrl = mdMatch[2];
    const normalized = normalizeUrl(rawUrl);
    if (normalized && !seenUrls.has(normalized.toLowerCase())) {
      seenUrls.add(normalized.toLowerCase());
      links.push({
        url: normalized,
        label: rawLabel.trim() || formatUrlLabel(normalized),
        isMarkdown: true,
      });
    }
  }

  // 2. Remove markdown link occurrences to avoid double extraction in raw scan
  const textWithoutMd = text.replace(MARKDOWN_LINK_REGEX, ' ');

  // 3. Extract raw URLs
  let rawMatch: RegExpExecArray | null;
  const rawRegex = new RegExp(RAW_URL_REGEX);
  while ((rawMatch = rawRegex.exec(textWithoutMd)) !== null) {
    const rawUrl = cleanRawUrl(rawMatch[0]);
    const normalized = normalizeUrl(rawUrl);
    if (normalized && !seenUrls.has(normalized.toLowerCase())) {
      seenUrls.add(normalized.toLowerCase());
      links.push({
        url: normalized,
        label: formatUrlLabel(normalized),
        isMarkdown: false,
      });
    }
  }

  return links;
}

/**
 * Tokenizes text into plain text segments and interactive link tokens.
 * Supports both markdown links `[label](url)` and raw URLs (`https://...`, `www....`).
 */
export function tokenizeTextWithLinks(text?: string | null): LinkToken[] {
  if (!text || typeof text !== 'string') return [];

  // Combined tokenization: Find all matches with their index in the string
  interface MatchItem {
    startIndex: number;
    endIndex: number;
    url: string;
    label: string;
    raw: string;
  }

  const matches: MatchItem[] = [];

  // 1. Find Markdown links
  const mdRegex = new RegExp(MARKDOWN_LINK_REGEX);
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdRegex.exec(text)) !== null) {
    const raw = mdMatch[0];
    const label = mdMatch[1];
    const url = normalizeUrl(mdMatch[2]);
    matches.push({
      startIndex: mdMatch.index,
      endIndex: mdMatch.index + raw.length,
      url,
      label,
      raw,
    });
  }

  // 2. Find Raw URLs that don't overlap with Markdown links
  const rawRegex = new RegExp(RAW_URL_REGEX);
  let rawMatch: RegExpExecArray | null;
  while ((rawMatch = rawRegex.exec(text)) !== null) {
    const raw = rawMatch[0];
    const cleaned = cleanRawUrl(raw);
    const startIndex = rawMatch.index;
    const endIndex = startIndex + cleaned.length;

    // Check overlap with any markdown link match
    const overlaps = matches.some(
      (m) => !(endIndex <= m.startIndex || startIndex >= m.endIndex)
    );

    if (!overlaps && cleaned) {
      const url = normalizeUrl(cleaned);
      matches.push({
        startIndex,
        endIndex,
        url,
        label: cleaned,
        raw: cleaned,
      });
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.startIndex - b.startIndex);

  const tokens: LinkToken[] = [];
  let cursor = 0;

  for (const match of matches) {
    // Leading plain text
    if (match.startIndex > cursor) {
      tokens.push({
        type: 'text',
        value: text.slice(cursor, match.startIndex),
      });
    }

    // Link token
    tokens.push({
      type: 'link',
      value: match.raw,
      url: match.url,
      label: match.label,
    });

    cursor = match.endIndex;
  }

  // Trailing plain text
  if (cursor < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(cursor),
    });
  }

  return tokens;
}
