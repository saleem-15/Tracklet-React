import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  LayoutGrid, 
  List, 
  Menu,
  X,
  Clock
} from 'lucide-react';
import { Contact, ContactCategory, Application } from '../types';
import { CONTACT_CATEGORIES, LOCAL_STORAGE_KEYS } from '../lib/constants';
import { 
  filterContacts, 
  sortContacts, 
  getContactsFollowUpDueSoon,
  ContactSortField, 
  ContactSortOrder 
} from '../lib/contactUtils';
import { ContactCardGrid } from './contacts/ContactCardGrid';
import { ContactTable } from './contacts/ContactTable';
import { ContactEmptyState } from './contacts/ContactEmptyState';
import { ContactModal } from './contacts/ContactModal';

interface ContactsViewProps {
  contacts: Contact[];
  applications: Application[];
  onAddContact: (contact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onSelectContact: (contactId: string) => void;
  onOpenMobileSidebar?: () => void;
  onShowToast?: (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    description?: string
  ) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  applications,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSelectContact,
  onOpenMobileSidebar,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | 'All'>('All');
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.CONTACTS_LAYOUT);
      return saved === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const [sortField, setSortField] = useState<ContactSortField>('name');
  const [sortOrder, setSortOrder] = useState<ContactSortOrder>('asc');

  // Contact Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const handleToggleLayout = (layout: 'grid' | 'table') => {
    setViewLayout(layout);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CONTACTS_LAYOUT, layout);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSortChange = (field: ContactSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleOpenAdd = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (editingContact) {
      await onUpdateContact(editingContact.id, contactData);
    } else {
      await onAddContact(contactData);
    }
  };

  // Follow-up due count (due within 48h or overdue within 120h)
  const dueFollowUpsCount = useMemo(() => {
    return getContactsFollowUpDueSoon(contacts, 48).length;
  }, [contacts]);

  // Filter & Sort Contacts
  const filteredAndSortedContacts = useMemo(() => {
    const filtered = filterContacts(contacts, searchQuery, selectedCategory, filterDueOnly);
    return sortContacts(filtered, sortField, sortOrder);
  }, [contacts, searchQuery, selectedCategory, filterDueOnly, sortField, sortOrder]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: contacts.length };
    CONTACT_CATEGORIES.forEach((cat) => {
      counts[cat] = contacts.filter((c) => c.category === cat).length;
    });
    return counts;
  }, [contacts]);

  const isFiltered = searchQuery.trim().length > 0 || selectedCategory !== 'All' || filterDueOnly;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
      {/* Top Header & Search Bar */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {onOpenMobileSidebar && (
              <button
                type="button"
                onClick={onOpenMobileSidebar}
                aria-label="Open sidebar"
                className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-none font-heading">
                Contacts &amp; Mentors Hub
              </h1>
              <span className="text-[11px] text-slate-500 font-mono">
                {filteredAndSortedContacts.length} of {contacts.length} contact{contacts.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Layout Toggle */}
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200/80 text-slate-500">
              <button
                type="button"
                onClick={() => handleToggleLayout('grid')}
                title="Grid layout"
                aria-label="Grid layout"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewLayout === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleLayout('table')}
                title="Table layout"
                aria-label="Table layout"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewLayout === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Add Contact Button */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer min-h-[36px]"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="hidden sm:inline">Add Contact</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Search & Category Chips */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role, organization, or email..."
              className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category & Follow-Up Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setFilterDueOnly(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'All' && !filterDueOnly
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              All ({categoryCounts.All || 0})
            </button>
            {CONTACT_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat && !filterDueOnly;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setFilterDueOnly(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {cat} {count > 0 && <span className="opacity-80 font-mono text-[11px]">({count})</span>}
                </button>
              );
            })}

            <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5" />

            {/* Needs Follow-up Quick Filter Chip */}
            <button
              type="button"
              onClick={() => setFilterDueOnly((prev) => !prev)}
              title="Filter contacts with pending or upcoming follow-ups"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer border ${
                filterDueOnly
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-medium'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${
                filterDueOnly
                  ? 'text-white'
                  : dueFollowUpsCount > 0
                  ? 'text-amber-500'
                  : 'text-slate-400'
              }`} />
              <span>Needs Follow-up</span>
              {dueFollowUpsCount > 0 ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
                  filterDueOnly
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {dueFollowUpsCount}
                </span>
              ) : (
                <span className={`font-mono text-[11px] ${filterDueOnly ? 'text-blue-200' : 'text-slate-400'}`}>
                  (0)
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredAndSortedContacts.length === 0 ? (
          <ContactEmptyState
            isFiltered={isFiltered}
            onAddContact={handleOpenAdd}
            onResetFilter={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setFilterDueOnly(false);
            }}
          />
        ) : viewLayout === 'grid' ? (
          <ContactCardGrid
            contacts={filteredAndSortedContacts}
            applications={applications}
            onSelectContact={onSelectContact}
            onEditContact={handleOpenEdit}
            onDeleteContact={onDeleteContact}
          />
        ) : (
          <ContactTable
            contacts={filteredAndSortedContacts}
            applications={applications}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onSelectContact={onSelectContact}
            onEditContact={handleOpenEdit}
            onDeleteContact={onDeleteContact}
          />
        )}
      </div>

      {/* Add / Edit Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        editingContact={editingContact}
        applications={applications}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveModal}
      />
    </div>
  );
};
