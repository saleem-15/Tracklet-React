/**
 * Utility to convert raw HTML job descriptions into clean, formatted Markdown.
 * Correctly identifies section headings (both standard <h1-h6> and CMS-generated bold headers)
 * without reducing them to plain bold text.
 */

export function htmlToMarkdown(htmlOrNode?: string | null): string {
  if (!htmlOrNode) return '';
  if (typeof htmlOrNode !== 'string') return '';

  let md = htmlOrNode;

  // 1. If HTML tags are escaped as &lt;p&gt; or &lt;b&gt;, unescape tag delimiters first
  if (/&lt;[a-z/][^&]*&gt;/i.test(md)) {
    md = md
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  }

  // If plain text with no tags, return trimmed
  if (!/<[a-z][\s\S]*>/i.test(md)) {
    return md.trim();
  }

  md = md.replace(/\r\n/g, '\n');

  // Strip script, style, comments
  md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Explicit Headings (strip any internal <b>, <strong>, <span> tags so headers remain clean)
  md = md.replace(/<h[12]\b[^>]*>(.*?)<\/h[12]>/gis, (_match, content) => {
    const clean = content.replace(/<[^>]+>/g, '').trim();
    return clean ? `\n\n## ${clean}\n\n` : '\n\n';
  });

  md = md.replace(/<h[3-6]\b[^>]*>(.*?)<\/h[3-6]>/gis, (_match, content) => {
    const clean = content.replace(/<[^>]+>/g, '').trim();
    return clean ? `\n\n### ${clean}\n\n` : '\n\n';
  });

  // 3. Implicit Headings: Job boards (Bayt, Indeed, LinkedIn, etc.) frequently wrap section titles
  // in <p><b>Heading</b></p>, <div><strong>Heading:</strong></div>, or <b>Heading:</b><br>.
  // Identify these short, standalone bold lines and convert them to markdown headings.
  md = md.replace(/<(?:p|div|section)\b[^>]*>\s*<(?:strong|b)\b[^>]*>([^<]+)<\/(?:strong|b)>\s*<\/(?:p|div|section)>/gi, (match, text) => {
    const clean = text.trim();
    if (clean.length > 0 && clean.length <= 80 && !clean.endsWith('.') && !clean.includes('. ')) {
      return `\n\n### ${clean}\n\n`;
    }
    return match;
  });

  md = md.replace(/<(?:strong|b)\b[^>]*>([^<]+)<\/(?:strong|b)>\s*(?:<br\s*[\/]?>|\n)+/gi, (match, text) => {
    const clean = text.trim();
    if (clean.length > 0 && clean.length <= 80 && !clean.endsWith('.') && !clean.includes('. ')) {
      return `\n\n### ${clean}\n\n`;
    }
    return match;
  });

  // 4. Formatting tags
  md = md.replace(/<(?:strong|b)\b[^>]*>(.*?)<\/(?:strong|b)>/gis, ' **$1** ');
  md = md.replace(/<(?:em|i)\b[^>]*>(.*?)<\/(?:em|i)>/gis, ' *$1* ');
  md = md.replace(/<code\b[^>]*>(.*?)<\/code>/gis, ' `$1` ');
  md = md.replace(/<pre\b[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n');

  // 5. Links
  md = md.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, '[$2]($1)');

  // 6. Lists
  md = md.replace(/<li\b[^>]*>(.*?)<\/li>/gis, '\n- $1');
  md = md.replace(/<\/(?:ul|ol)>/gis, '\n\n');
  md = md.replace(/<(?:ul|ol)\b[^>]*>/gis, '\n');

  // 7. Structural elements
  md = md.replace(/<p\b[^>]*>(.*?)<\/p>/gis, '\n\n$1\n\n');
  md = md.replace(/<blockquote\b[^>]*>(.*?)<\/blockquote>/gis, '\n> $1\n\n');
  md = md.replace(/<br\s*[\/]?>/gi, '\n');
  md = md.replace(/<hr\s*[\/]?>/gi, '\n\n---\n\n');
  md = md.replace(/<\/?(?:div|section|article|main|header|footer|span)\b[^>]*>/gi, '\n');

  // 8. Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // 9. Decode HTML entities
  md = md
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&bull;/gi, '•')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—');

  // 10. Post-process headings:
  // Convert any remaining standalone bold lines (e.g. "**Job Description**" or "**Skills:**") to headings
  md = md.replace(/^(\s*)\*\*([^*\n]+)\*\*(\s*)$/gm, (match, before, text, after) => {
    const clean = text.trim();
    if (clean.length > 0 && clean.length <= 80 && !clean.endsWith('.') && !clean.includes('. ')) {
      return `${before}### ${clean}${after}`;
    }
    return match;
  });

  // Strip redundant bold markers from inside markdown headings (e.g. "### **Title**" -> "### Title")
  md = md.replace(/^(#{1,6}\s+)\*\*([^*\n]+)\*\*\s*$/gm, '$1$2');
  md = md.replace(/^(#{1,6}\s+)\*([^*\n]+)\*\s*$/gm, '$1$2');

  // 11. Clean whitespace and normalize line breaks
  md = md
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return md;
}
