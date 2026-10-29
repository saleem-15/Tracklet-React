import React from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { SettingsCard } from '../../SettingsCard';
import { CandidateProfile } from '../../../../types';

export interface AutofillContactCardProps {
  data: Partial<CandidateProfile>;
  onChange: <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => void;
}

export const AutofillContactCard: React.FC<AutofillContactCardProps> = ({ data, onChange }) => {
  const locationString = typeof data.location === 'string' 
    ? data.location 
    : data.location?.formattedLocation || data.location?.city || '';

  return (
    <SettingsCard
      title="Personal & Contact Information"
      icon={<User className="w-5 h-5 text-blue-600" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-1.5">
          <label htmlFor="first-name" className="block text-xs font-semibold text-slate-800">
            First Name
          </label>
          <input
            id="first-name"
            type="text"
            value={data.firstName || ''}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="e.g. Alex"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Last Name */}
        <div className="space-y-1.5">
          <label htmlFor="last-name" className="block text-xs font-semibold text-slate-800">
            Last Name
          </label>
          <input
            id="last-name"
            type="text"
            value={data.lastName || ''}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="e.g. Mercer"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Primary Job Hunt Email */}
        <div className="space-y-1.5">
          <label htmlFor="autofill-email" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span>Application Email</span>
          </label>
          <input
            id="autofill-email"
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="alex.mercer@example.com"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label htmlFor="autofill-phone" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span>Phone Number</span>
          </label>
          <input
            id="autofill-phone"
            type="tel"
            value={data.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors font-mono"
          />
        </div>

        {/* Current Location */}
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="autofill-location" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>Current Location (City, State / Country)</span>
          </label>
          <input
            id="autofill-location"
            type="text"
            value={locationString}
            onChange={(e) => onChange('location', e.target.value)}
            placeholder="e.g. San Francisco, CA, USA or London, UK"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>
    </SettingsCard>
  );
};
