import React, { useMemo } from 'react';
import { User } from 'lucide-react';
import { Contact } from '../../types';
import { CONTACT_AVATAR_COLORS, getInitials } from '../../lib/constants';
import { CloseIconButton } from '../IconButton';

export interface ContactModalHeaderProps {
  editingContact?: Contact | null;
  name: string;
  contextualCompany?: string;
  onClose: () => void;
}

export const ContactModalHeader: React.FC<ContactModalHeaderProps> = ({
  editingContact,
  name,
  contextualCompany,
  onClose,
}) => {
  const avatarStyle = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { isInitial: false, colorClass: 'bg-blue-50 text-blue-600 border-blue-200/80', initials: '' };
    }
    const colorIndex =
      trimmed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % CONTACT_AVATAR_COLORS.length;
    return {
      isInitial: true,
      colorClass: CONTACT_AVATAR_COLORS[colorIndex],
      initials: getInitials(trimmed),
    };
  }, [name]);

  return (
    <div className="px-5 py-3 border-b border-slate-200/80 bg-white flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {/* Dynamic Avatar */}
        <div
          className={`w-9 h-9 rounded-[10px] border flex items-center justify-center font-heading font-bold text-xs shrink-0 transition-colors duration-150 ${avatarStyle.colorClass}`}
        >
          {avatarStyle.isInitial ? avatarStyle.initials : <User className="w-4 h-4" />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 font-heading tracking-tight truncate">
              {editingContact ? 'Edit Contact' : 'New Contact'}
            </h2>
            {contextualCompany && !editingContact && (
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[6px] bg-blue-50 text-blue-700 border border-blue-200/80 truncate">
                {contextualCompany}
              </span>
            )}
          </div>
          {editingContact?.organization && (
            <p className="text-[11px] text-slate-600 font-mono truncate">
              {editingContact.organization}
            </p>
          )}
        </div>
      </div>

      <CloseIconButton onClick={onClose} size="md" />
    </div>
  );
};
