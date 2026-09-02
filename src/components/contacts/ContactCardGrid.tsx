import React from 'react';
import { 
  Building2, 
  Briefcase, 
  Mail, 
  Linkedin, 
  Phone, 
  Clock, 
  Link2, 
  MoreVertical,
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
  getContactFollowUpHoursRemaining, 
  formatContactHoursLeft 
} from '../../lib/contactUtils';
import { FollowUpBadge } from './FollowUpBadge';

interface ContactCardGridProps {
  contacts: Contact[];
  applications?: Application[];
  onSelectContact: (contactId: string) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
}

export const ContactCardGrid: React.FC<ContactCardGridProps> = ({
  contacts,
  applications = [],
  onSelectContact,
  onEditContact,
  onDeleteContact,
}) => {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  // Close popup menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const getApplicationNames = (appIds?: string[]): string[] => {
    if (!appIds || appIds.length === 0) return [];
    return appIds
      .map((id) => applications.find((a) => a.id === id)?.company)
      .filter((name): name is string => Boolean(name));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-200">
      {contacts.map((contact) => {
        const colorIndex = (contact.id || contact.name)
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0) % CONTACT_AVATAR_COLORS.length;
        const avatarColor = CONTACT_AVATAR_COLORS[colorIndex];
        const category = contact.category || 'Other';
        const categoryStyle = CONTACT_CATEGORY_STYLES[category] || CONTACT_CATEGORY_STYLES.Other;
        const linkedCompanies = getApplicationNames(contact.applicationIds);

        // Follow-up info
        const followUpHours = contact.nextFollowUpDate
          ? getContactFollowUpHoursRemaining(contact.nextFollowUpDate)
          : null;
        const isFollowUpDueSoon = followUpHours !== null && followUpHours <= 48 && followUpHours >= -120;
        const isFollowUpOverdue = followUpHours !== null && followUpHours < 0;

        return (
          <div
            key={contact.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectContact(contact.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectContact(contact.id);
              }
            }}
            aria-label={`View contact ${contact.name}`}
            className="group relative flex flex-col justify-between rounded-2xl bg-white border border-slate-200/85 hover:border-blue-300/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs hover:shadow-md hover:shadow-blue-500/5 transition-all p-4.5 cursor-pointer text-left overflow-hidden"
          >
            <div>
              {/* Top Row: Avatar + Category Chip + Menu */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 shadow-2xs ${avatarColor}`}
                  >
                    {getInitials(contact.name)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate leading-snug group-hover:text-blue-600 transition-colors font-heading">
                      {contact.name}
                    </h4>
                    {category && category !== 'Other' && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 mt-0.5 rounded-md text-[10px] font-semibold border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                      >
                        {category}
                      </span>
                    )}
                  </div>
                </div>

                {/* More Menu */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === contact.id ? null : contact.id);
                    }}
                    aria-label="Contact actions"
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center opacity-70 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenuId === contact.id && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onEditContact(contact);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Contact</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onDeleteContact(contact.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Contact</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Role & Org */}
              <div className="space-y-1 my-2">
                {contact.role && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{contact.role}</span>
                  </div>
                )}
                {contact.organization && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate font-medium text-slate-700">{contact.organization}</span>
                  </div>
                )}
              </div>

              {/* Follow-up Indicator (if configured) */}
              {contact.nextFollowUpDate && (
                <div className="mt-2.5">
                  <FollowUpBadge dueDateStr={contact.nextFollowUpDate} size="md" />
                </div>
              )}
            </div>

            {/* Bottom: Linked Apps & Quick Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                {linkedCompanies.length > 0 ? (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-blue-700 bg-blue-50/70 border border-blue-200/60 px-2 py-0.5 rounded-md truncate">
                    <Link2 className="w-3 h-3 shrink-0" />
                    <span className="truncate font-medium">
                      {linkedCompanies.length === 1
                        ? linkedCompanies[0]
                        : `${linkedCompanies[0]} +${linkedCompanies.length - 1}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500 font-mono">Standalone</span>
                )}
              </div>

              {/* Quick Communication Links */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    title={`Email ${contact.name}`}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    title={`Call ${contact.name}`}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
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
                    className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
