/**
 * Utility to convert raw HTML job descriptions into clean, formatted Markdown.
 */

export function htmlToMarkdown(htmlOrNode?: string | null): string {
  if (!htmlOrNode) return '';
  if (typeof htmlOrNode !== 'string') return '';
  
  // If plain text with no tags, return trimmed
  if (!/<[a-z][\s\S]*>/i.test(htmlOrNode)) {
    return htmlOrNode.trim();
  }

  let md = htmlOrNode;
  md = md.replace(/\r\n/g, '\n');

  // Strip script, style, comments
  md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gis, '\n\n# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gis, '\n\n## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gis, '\n\n### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gis, '\n\n#### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gis, '\n\n##### $1\n\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gis, '\n\n###### $1\n\n');

  // Formatting
  md = md.replace(/<(?:strong|b)\b[^>]*>(.*?)<\/(?:strong|b)>/gis, ' **$1** ');
  md = md.replace(/<(?:em|i)\b[^>]*>(.*?)<\/(?:em|i)>/gis, ' *$1* ');
  md = md.replace(/<code\b[^>]*>(.*?)<\/code>/gis, ' `$1` ');
  md = md.replace(/<pre\b[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n');

  // Links
  md = md.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, '[$2]($1)');

  // Lists
  md = md.replace(/<li\b[^>]*>(.*?)<\/li>/gis, '\n- $1');
  md = md.replace(/<\/(?:ul|ol)>/gis, '\n\n');
  md = md.replace(/<(?:ul|ol)\b[^>]*>/gis, '\n');

  // Paragraphs & structural elements
  md = md.replace(/<p\b[^>]*>(.*?)<\/p>/gis, '\n\n$1\n\n');
  md = md.replace(/<blockquote\b[^>]*>(.*?)<\/blockquote>/gis, '\n> $1\n\n');
  md = md.replace(/<br\s*[\/]?>/gi, '\n');
  md = md.replace(/<hr\s*[\/]?>/gi, '\n\n---\n\n');
  md = md.replace(/<\/?(?:div|section|article|main|header|footer|span)\b[^>]*>/gi, '\n');

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
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

  // Clean redundant whitespace and newlines
  md = md
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return md;
}
