import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, UserPlus, X, Check, Building2, Briefcase, ChevronDown } from 'lucide-react';
import { Contact, ContactCategory } from '../types';
import { CONTACT_CATEGORIES, CONTACT_CATEGORY_STYLES, CONTACT_AVATAR_COLORS, getInitials } from '../lib/constants';
import { CustomSelectDropdown, SelectOption } from './CustomSelectDropdown';

const categoryOptions: SelectOption<ContactCategory>[] = CONTACT_CATEGORIES.map((cat) => ({
  label: cat,
  value: cat,
}));

export interface ContactSearchPickerProps {
  contacts: Contact[];
  linkedContactIds?: string[];
  onSelectContact: (contact: Contact) => void;
  onCreateAndLink?: (newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  placeholder?: string;
  onCancel?: () => void;
}

export const ContactSearchPicker: React.FC<ContactSearchPickerProps> = ({
  contacts,
  linkedContactIds = [],
  onSelectContact,
  onCreateAndLink,
  placeholder = 'Search contacts by name, role, or company...',
  onCancel,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isCreatingInline, setIsCreatingInline] = useState(false);

  // Inline creation form fields
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newCategory, setNewCategory] = useState<ContactCategory>('Recruiter');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter available contacts (excluding already linked)
  const availableContacts = useMemo(() => {
    const unlinked = contacts.filter((c) => !linkedContactIds.includes(c.id));
    if (!query.trim()) return unlinked.slice(0, 10);

    const q = query.trim().toLowerCase();
    return unlinked
      .filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const roleMatch = c.role?.toLowerCase().includes(q);
        const orgMatch = c.organization?.toLowerCase().includes(q);
        const emailMatch = c.email?.toLowerCase().includes(q);
        return nameMatch || roleMatch || orgMatch || emailMatch;
      })
      .slice(0, 10);
  }, [contacts, linkedContactIds, query]);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [availableContacts]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isCreatingInline) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < availableContacts.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (availableContacts[highlightedIndex]) {
        onSelectContact(availableContacts[highlightedIndex]);
        setQuery('');
      } else if (query.trim() && onCreateAndLink) {
        startInlineCreate(query.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (onCancel) {
        onCancel();
      } else {
        setIsOpen(false);
      }
    }
  };

  const startInlineCreate = (initialName: string) => {
    setNewName(initialName);
    setNewRole('');
    setNewOrg('');
    setNewCategory('Recruiter');
    setNewEmail('');
    setNewPhone('');
    setIsCreatingInline(true);
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !onCreateAndLink) return;

    setIsSubmittingNew(true);
    try {
      await onCreateAndLink({
        name: newName.trim(),
        role: newRole.trim() || undefined,
        organization: newOrg.trim() || undefined,
        category: newCategory,
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
      });
      setIsCreatingInline(false);
      setQuery('');
    } catch (err) {
      console.error('Failed to create and link contact:', err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2 relative animate-in fade-in duration-150">
      {!isCreatingInline ? (
        <div className="space-y-1.5">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-8 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Typeahead Suggestions Dropdown */}
          {isOpen && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-lg divide-y divide-slate-100 max-h-60 overflow-y-auto z-20">
              {availableContacts.length > 0 ? (
                availableContacts.map((contact, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const avatarColor = CONTACT_AVATAR_COLORS[idx % CONTACT_AVATAR_COLORS.length];
                  const categoryStyle =
                    CONTACT_CATEGORY_STYLES[contact.category || 'Other'] ||
                    CONTACT_CATEGORY_STYLES.Other;

                  return (
                    <div
                      key={contact.id}
                      onClick={() => {
                        onSelectContact(contact);
                        setQuery('');
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isHighlighted ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg border font-bold font-mono text-[10px] flex items-center justify-center shrink-0 shadow-2xs ${avatarColor}`}
                        >
                          {getInitials(contact.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate leading-none">
                            {contact.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate mt-0.5">
                            {contact.role && <span>{contact.role}</span>}
                            {contact.role && contact.organization && <span>·</span>}
                            {contact.organization && <span>{contact.organization}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                        >
                          {contact.category || 'Other'}
                        </span>
                        <span className="text-[11px] font-mono text-blue-600 font-semibold">
                          Link
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : query.trim() ? (
                <div className="p-3 text-center text-xs text-slate-500 font-mono">
                  No existing contact matching "{query}"
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-500 font-mono">
                  No contacts available to link.
                </div>
              )}

              {/* Inline Create Option */}
              {onCreateAndLink && query.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => startInlineCreate(query.trim())}
                  className="w-full p-2.5 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer text-left border-t border-slate-100"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                  <span className="truncate">
                    Create new contact <strong>"{query.trim()}"</strong>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Inline Contact Creation Form (US6) */
        <form
          onSubmit={handleInlineSubmit}
          className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
            <h4 className="text-xs font-bold text-slate-900 font-heading flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Create &amp; Link New Contact</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsCreatingInline(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold mb-0.5">
                Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-white text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold mb-0.5">
                Category
              </label>
              <CustomSelectDropdown<ContactCategory>
                value={newCategory}
                onChange={setNewCategory}
                options={categoryOptions}
                size="sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold mb-0.5">
                Role
              </label>
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Recruiter"
                className="w-full bg-white text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold mb-0.5">
                Company / Org
              </label>
              <input
                type="text"
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                placeholder="e.g. Linear"
                className="w-full bg-white text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold mb-0.5">
                Email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold mb-0.5">
                Phone
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 555-0000"
                className="w-full bg-white text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingInline(false)}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingNew || !newName.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmittingNew ? 'Saving...' : 'Save & Link'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
