import React from 'react';
import { User, ChevronDown, AtSign, Plus } from 'lucide-react';

export interface RecipientOption {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface FollowUpRecipientSelectorProps {
  recipientOptions: RecipientOption[];
  selectedRecipientId: string;
  onSelectRecipientId: (id: string) => void;
  customName: string;
  setCustomName: (name: string) => void;
  customEmail: string;
  setCustomEmail: (email: string) => void;
}

export const FollowUpRecipientSelector: React.FC<FollowUpRecipientSelectorProps> = ({
  recipientOptions,
  selectedRecipientId,
  onSelectRecipientId,
  customName,
  setCustomName,
  customEmail,
  setCustomEmail,
}) => {
  const isCustom = selectedRecipientId === 'custom';
  const activeOption = recipientOptions.find((r) => r.id === selectedRecipientId);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono font-semibold text-slate-500 uppercase text-[11px] w-8 shrink-0">
          To:
        </span>

        {recipientOptions.map((rec) => {
          const isSelected = selectedRecipientId === rec.id;
          return (
            <button
              key={rec.id}
              type="button"
              onClick={() => onSelectRecipientId(rec.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <AtSign className={`w-3 h-3 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{rec.name}</span>
              <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-700' : 'text-slate-400'}`}>
                &lt;{rec.email}&gt;
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelectRecipientId('custom')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            isCustom
              ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-2xs'
              : 'bg-white border-dashed border-slate-300 text-slate-600 hover:border-blue-400'
          }`}
        >
          <Plus className="w-3 h-3" />
          <span>Custom Recipient</span>
        </button>
      </div>

      {isCustom && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10 pt-1">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Recipient Name (e.g. Karla Lindqvist)"
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
          />
          <input
            type="email"
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            placeholder="Recipient Email (e.g. karla@company.com)"
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
          />
        </div>
      )}
    </div>
  );
};
