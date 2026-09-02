import React from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Mail, 
  Linkedin, 
  Phone, 
  Clock, 
  Link2,
  Pencil,
  Trash2
} from 'lucide-react';
import { Contact, Application } from '../../types';
import { 
  CONTACT_CATEGORY_STYLES, 
  CONTACT_AVATAR_COLORS, 
  getInitials 
} from '../../lib/constants';
import { 
  ContactSortField, 
  ContactSortOrder,
  getContactFollowUpHoursRemaining, 
  formatContactHoursLeft 
} from '../../lib/contactUtils';
import { FollowUpBadge } from './FollowUpBadge';

interface ContactTableProps {
  contacts: Contact[];
  applications?: Application[];
  sortField: ContactSortField;
  sortOrder: ContactSortOrder;
  onSortChange: (field: ContactSortField) => void;
  onSelectContact: (contactId: string) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
}

export const ContactTable: React.FC<ContactTableProps> = ({
  contacts,
  applications = [],
  sortField,
  sortOrder,
  onSortChange,
  onSelectContact,
  onEditContact,
  onDeleteContact,
}) => {
  const getApplicationNames = (appIds?: string[]): string[] => {
    if (!appIds || appIds.length === 0) return [];
    return appIds
      .map((id) => applications.find((a) => a.id === id)?.company)
      .filter((name): name is string => Boolean(name));
  };

  const renderSortIcon = (field: ContactSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden animate-in fade-in duration-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold select-none">
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => onSortChange('name')}
                  className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer group"
                >
                  <span>Name</span>
                  {renderSortIcon('name')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => onSortChange('organization')}
                  className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer group"
                >
                  <span>Role &amp; Org</span>
                  {renderSortIcon('organization')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => onSortChange('category')}
                  className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer group"
                >
                  <span>Category</span>
                  {renderSortIcon('category')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => onSortChange('nextFollowUpDate')}
                  className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer group"
                >
                  <span>Follow-up</span>
                  {renderSortIcon('nextFollowUpDate')}
                </button>
              </th>
              <th className="py-3 px-4">Linked Applications</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {contacts.map((contact) => {
              const colorIndex = (contact.id || contact.name)
                .split('')
                .reduce((acc, char) => acc + char.charCodeAt(0), 0) % CONTACT_AVATAR_COLORS.length;
              const avatarColor = CONTACT_AVATAR_COLORS[colorIndex];
              const category = contact.category || 'Other';
              const categoryStyle = CONTACT_CATEGORY_STYLES[category] || CONTACT_CATEGORY_STYLES.Other;
              const linkedCompanies = getApplicationNames(contact.applicationIds);

              const followUpHours = contact.nextFollowUpDate
                ? getContactFollowUpHoursRemaining(contact.nextFollowUpDate)
                : null;
              const isFollowUpDueSoon = followUpHours !== null && followUpHours <= 48 && followUpHours >= -120;
              const isFollowUpOverdue = followUpHours !== null && followUpHours < 0;

              return (
                <tr
                  key={contact.id}
                  onClick={() => onSelectContact(contact.id)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Name + Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg border font-bold font-mono text-[11px] flex items-center justify-center shrink-0 shadow-2xs ${avatarColor}`}
                      >
                        {getInitials(contact.name)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate block">
                          {contact.name}
                        </span>
                        {contact.email && (
                          <span className="text-[11px] text-slate-500 font-mono truncate block">
                            {contact.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role & Org */}
                  <td className="py-3 px-4 text-slate-700">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {contact.role || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {contact.organization || '—'}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    {category && category !== 'Other' ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                      >
                        {category}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Follow-up */}
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {contact.nextFollowUpDate ? (
                      <FollowUpBadge dueDateStr={contact.nextFollowUpDate} size="sm" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Linked Apps */}
                  <td className="py-3 px-4">
                    {linkedCompanies.length > 0 ? (
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-md max-w-[160px] truncate">
                        <Link2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {linkedCompanies.length === 1
                            ? linkedCompanies[0]
                            : `${linkedCompanies[0]} +${linkedCompanies.length - 1}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">Standalone</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          title={`Email ${contact.name}`}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          title={`Call ${contact.name}`}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {contact.linkedIn && (
                        <a
                          href={contact.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="LinkedIn Profile"
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditContact(contact)}
                        title="Edit contact"
                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteContact(contact.id)}
                        title="Delete contact"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
