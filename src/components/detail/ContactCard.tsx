import React from 'react';
import { Pencil, Linkedin, Phone, Check, Copy } from 'lucide-react';
import { Contact } from '../../types';
import { getInitials } from '../../lib/constants';
import { IconButton, DeleteIconButton, EmailIconButton } from '../IconButton';

export interface ContactCardProps {
  contact: Contact;
  avatarColor: string;
  isCopiedPhone: boolean;
  onStartEdit: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onCopyPhone: (phone: string, id: string) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  avatarColor,
  isCopiedPhone,
  onStartEdit,
  onDeleteContact,
  onCopyPhone,
}) => {
  return (
    <div className="p-3 hover:bg-slate-50/60 transition-colors group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}
          >
            {getInitials(contact.name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate leading-tight">{contact.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{contact.role || 'Contact'}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {contact.email && (
            <EmailIconButton email={contact.email} title={`Email ${contact.name}`} />
          )}
          {contact.linkedIn && (
            <a
              href={contact.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              title="LinkedIn"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          )}
          <IconButton
            icon={Pencil}
            onClick={() => onStartEdit(contact)}
            title="Edit contact"
            className="opacity-0 group-hover:opacity-100"
          />
          <DeleteIconButton
            onClick={() => onDeleteContact(contact.id)}
            title="Remove contact"
            className="opacity-0 group-hover:opacity-100"
          />
        </div>
      </div>

      {(contact.phone || contact.notes) && (
        <div className="mt-2 pl-[42px] space-y-1.5">
          {contact.phone && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 group/phone">
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{contact.phone}</span>
              </div>
              <button
                type="button"
                onClick={() => onCopyPhone(contact.phone!, contact.id)}
                className="opacity-0 group-hover/phone:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded cursor-pointer font-semibold"
              >
                {isCopiedPhone ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
          {contact.notes && (
            <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-2 leading-relaxed">
              {contact.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
