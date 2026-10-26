import React, { useState, useMemo } from 'react';
import { X, Keyboard, Search } from 'lucide-react';
import { useEscapeKey } from '../lib/useEscapeKey';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutDef {
  label: string;
  combos: string[][];
}

interface ShortcutCategory {
  id: string;
  title: string;
  items: ShortcutDef[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    id: 'general',
    title: 'General',
    items: [
      {
        label: 'Keyboard shortcuts cheat sheet',
        combos: [['?'], ['Ctrl', '/']],
      },
      {
        label: 'Quick search & filter',
        combos: [['/'], ['Ctrl', 'K']],
      },
      {
        label: 'Quick add new application',
        combos: [['N']],
      },
      {
        label: 'Report a bug or feedback',
        combos: [['Ctrl', 'Alt', 'B']],
      },
      {
        label: 'Submit bug report / feedback',
        combos: [['Ctrl', 'Enter']],
      },
      {
        label: 'Close active dialog, drawer or menu',
        combos: [['Esc']],
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    items: [
      {
        label: 'Toggle sidebar collapse',
        combos: [['Ctrl', 'B']],
      },
      {
        label: 'Switch to All Applications',
        combos: [['1']],
      },
      {
        label: 'Switch to Active Pipeline',
        combos: [['2']],
      },
      {
        label: 'Switch to Contacts & Mentors',
        combos: [['3']],
      },
      {
        label: 'Switch to Analytics & ROI',
        combos: [['4']],
      },
      {
        label: 'Switch to Settings',
        combos: [['5']],
      },
    ],
  },
  {
    id: 'views',
    title: 'Table & Pipeline',
    items: [
      {
        label: 'Open highlighted application details',
        combos: [['Enter']],
      },
      {
        label: 'Navigate rows (Table)',
        combos: [['↑', '↓']],
      },
      {
        label: 'Advance / previous stage (Pipeline card)',
        combos: [['←', '→']],
      },
      {
        label: 'Toggle row selection (Table)',
        combos: [['Space'], ['X']],
      },
      {
        label: 'Delete selected item(s)',
        combos: [['Del'], ['Backspace']],
      },
      {
        label: 'Jump page up / down (Table)',
        combos: [['PgUp', 'PgDn']],
      },
      {
        label: 'Jump to start / end of list (Table)',
        combos: [['Home', 'End']],
      },
    ],
  },
  {
    id: 'editor',
    title: 'Notes & Editor',
    items: [
      {
        label: 'Open slash commands palette',
        combos: [['/']],
      },
      {
        label: 'Bold formatting',
        combos: [['Ctrl', 'B']],
      },
      {
        label: 'Italic formatting',
        combos: [['Ctrl', 'I']],
      },
      {
        label: 'Insert or edit link',
        combos: [['Ctrl', 'K']],
      },
      {
        label: 'Inline code formatting',
        combos: [['Ctrl', 'Shift', 'K']],
      },
      {
        label: 'Headings shorthand',
        combos: [['# + Space'], ['## + Space']],
      },
      {
        label: 'Task checklist shorthand',
        combos: [['[ ] + Space']],
      },
      {
        label: 'Bullet or numbered list',
        combos: [['- + Space'], ['1. + Space']],
      },
      {
        label: 'Blockquote shorthand',
        combos: [['> + Space']],
      },
      {
        label: 'Divider / horizontal rule',
        combos: [['--- + Space']],
      },
    ],
  },
];

function formatKeyName(key: string, isMac: boolean): string {
  if (isMac) {
    if (key === 'Ctrl') return '⌘';
    if (key === 'Alt') return '⌥';
    if (key === 'Shift') return '⇧';
  }
  return key;
}

export function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-[22px] px-1.5 text-[11px] font-mono font-medium text-slate-700 bg-slate-100 border border-slate-200/90 rounded-md select-none">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  useEscapeKey(onClose, isOpen);

  const isMac = useMemo(() => {
    return (
      typeof navigator !== 'undefined' &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent)
    );
  }, []);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SHORTCUT_CATEGORIES;

    return SHORTCUT_CATEGORIES.map((cat) => {
      const filteredItems = cat.items.filter((item) => {
        if (item.label.toLowerCase().includes(q)) return true;
        if (cat.title.toLowerCase().includes(q)) return true;
        return item.combos.some((combo) =>
          combo.some((k) => k.toLowerCase().includes(q))
        );
      });
      return { ...cat, items: filteredItems };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title on left, Close button on right */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2
            id="keyboard-shortcuts-title"
            className="text-base font-semibold text-slate-900 font-heading"
          >
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts"
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              autoFocus
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear shortcut search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Keyboard className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Content Body: Single list view with category headers */}
        <div className="overflow-y-auto px-6 py-2 pb-6 flex-1 max-h-[60vh] space-y-5">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-800">
                No shortcuts found
              </p>
              <p className="text-xs text-slate-500">
                Try searching for &quot;search&quot;, &quot;table&quot;, or &quot;bold&quot;.
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-900 pt-1 pb-1">
                  {cat.title}
                </h3>
                <div className="divide-y divide-slate-100">
                  {cat.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 text-xs"
                    >
                      <span className="text-slate-600 font-normal">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.combos.map((combo, comboIdx) => (
                          <React.Fragment key={comboIdx}>
                            {comboIdx > 0 && (
                              <span className="text-[10px] text-slate-400 px-0.5">
                                or
                              </span>
                            )}
                            <div className="inline-flex items-center gap-1">
                              {combo.map((keyName, kIdx) => (
                                <KeyCap key={kIdx}>
                                  {formatKeyName(keyName, isMac)}
                                </KeyCap>
                              ))}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
