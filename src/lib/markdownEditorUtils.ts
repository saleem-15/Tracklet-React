/**
 * Pure utility functions for text manipulation, selection formatting,
 * and list auto-continuation within the markdown editor.
 */

export interface FormatResult {
  newText: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface ListContinuationResult {
  handled: boolean;
  newText: string;
  newCursorPos: number;
}

/**
 * Wraps or inserts markdown formatting tokens around the active selection.
 */
export function applyFormattingToText(
  text: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string = '',
  placeholder: string = 'text',
  isBlock: boolean = false
): FormatResult {
  const currentVal = text || '';
  const selectedText = currentVal.substring(start, end);

  let insertion = '';
  let newCursorStart = start;
  let newCursorEnd = end;

  if (selectedText) {
    // User highlighted text -> wrap it
    insertion = `${prefix}${selectedText}${suffix}`;
    newCursorStart = start;
    newCursorEnd = start + insertion.length;
  } else {
    // No selection -> insert placeholder and select it
    let actualPrefix = prefix;
    if (isBlock && start > 0 && currentVal[start - 1] !== '\n') {
      actualPrefix = '\n' + prefix;
    }
    insertion = `${actualPrefix}${placeholder}${suffix}`;
    newCursorStart = start + actualPrefix.length;
    newCursorEnd = newCursorStart + placeholder.length;
  }

  const newText =
    currentVal.substring(0, start) + insertion + currentVal.substring(end);

  return {
    newText,
    selectionStart: newCursorStart,
    selectionEnd: newCursorEnd,
  };
}

/**
 * Handles Enter key presses within lists:
 * - Numbered lists (e.g. "1. item" -> "2. ")
 * - Bullet lists (e.g. "- item" -> "- ")
 * - Exits the list if pressed on an empty item
 */
export function handleListContinuationOnEnter(
  text: string,
  cursor: number
): ListContinuationResult {
  const val = text || '';
  const textBeforeCursor = val.substring(0, cursor);
  const lastNewline = textBeforeCursor.lastIndexOf('\n');
  const currentLine = textBeforeCursor.substring(lastNewline + 1);

  // 1. Numbered list match (e.g. "1. ", "  2. text")
  const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
  if (numberedMatch) {
    const indent = numberedMatch[1];
    const currentNum = parseInt(numberedMatch[2], 10);
    const itemContent = numberedMatch[3];

    // If empty item (e.g. "2. "), clear prefix and exit list
    if (!itemContent.trim()) {
      const lineStart = lastNewline + 1;
      const newText = val.substring(0, lineStart) + val.substring(cursor);
      return {
        handled: true,
        newText,
        newCursorPos: lineStart,
      };
    }

    // Add next incremented item (n + 1)
    const nextNum = currentNum + 1;
    const insertion = `\n${indent}${nextNum}. `;
    const newText = val.substring(0, cursor) + insertion + val.substring(cursor);
    return {
      handled: true,
      newText,
      newCursorPos: cursor + insertion.length,
    };
  }

  // 2. Bullet list match (e.g. "- ", "* item")
  const bulletMatch = currentLine.match(/^(\s*)([-*])\s*(.*)$/);
  if (bulletMatch) {
    const indent = bulletMatch[1];
    const bulletChar = bulletMatch[2];
    const itemContent = bulletMatch[3];

    // If empty bullet, clear it and exit list
    if (!itemContent.trim()) {
      const lineStart = lastNewline + 1;
      const newText = val.substring(0, lineStart) + val.substring(cursor);
      return {
        handled: true,
        newText,
        newCursorPos: lineStart,
      };
    }

    // Continue bullet list
    const insertion = `\n${indent}${bulletChar} `;
    const newText = val.substring(0, cursor) + insertion + val.substring(cursor);
    return {
      handled: true,
      newText,
      newCursorPos: cursor + insertion.length,
    };
  }

  return {
    handled: false,
    newText: val,
    newCursorPos: cursor,
  };
}
