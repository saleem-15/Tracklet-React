import React from 'react';
import { ContactCategory } from '../../types';
import { CONTACT_CATEGORIES } from '../../lib/constants';
import { CustomSelectDropdown, SelectOption } from '../CustomSelectDropdown';

export interface ContactFormFieldsProps {
  name: string;
  setName: (val: string) => void;
  category: ContactCategory;
  setCategory: (val: ContactCategory) => void;
  role: string;
  setRole: (val: string) => void;
  organization: string;
  setOrganization: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  linkedIn: string;
  setLinkedIn: (val: string) => void;
  autoFocus?: boolean;
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
  onClearDuplicate?: () => void;
}

const categoryOptions: SelectOption<ContactCategory>[] = CONTACT_CATEGORIES.map((cat) => ({
  label: cat,
  value: cat,
}));

export const ContactFormFields: React.FC<ContactFormFieldsProps> = ({
  name,
  setName,
  category,
  setCategory,
  role,
  setRole,
  organization,
  setOrganization,
  email,
  setEmail,
  phone,
  setPhone,
  linkedIn,
  setLinkedIn,
  autoFocus = false,
  nameInputRef,
  onClearDuplicate,
}) => {
  const textInputClass =
    'w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-500 px-3 h-[36px] rounded-[10px] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-medium transition-[background-color,border-color,box-shadow] duration-150';

  const monoInputClass =
    'w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-500 px-3 h-[36px] rounded-[10px] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-mono transition-[background-color,border-color,box-shadow] duration-150 truncate';

  return (
    <div className="space-y-3.5">
      {/* Name & Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            ref={nameInputRef}
            type="text"
            required
            autoFocus={autoFocus}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onClearDuplicate?.();
            }}
            placeholder="Jane Doe"
            className={textInputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Category
          </label>
          <CustomSelectDropdown<ContactCategory>
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            size="md"
            buttonClassName="!h-[36px] !rounded-[10px]"
            className="w-full"
          />
        </div>
      </div>

      {/* Role & Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Role / Title
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Lead Recruiter"
            className={textInputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Company
          </label>
          <input
            type="text"
            value={organization}
            onChange={(e) => {
              setOrganization(e.target.value);
              onClearDuplicate?.();
            }}
            placeholder="e.g. Google"
            className={textInputClass}
          />
        </div>
      </div>

      {/* Email & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onClearDuplicate?.();
            }}
            placeholder="jane@company.com"
            className={monoInputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              onClearDuplicate?.();
            }}
            placeholder="+1 (555) 000-0000"
            className={monoInputClass}
          />
        </div>
      </div>

      {/* LinkedIn Profile */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-700">
          LinkedIn Profile
        </label>
        <input
          type="text"
          value={linkedIn}
          onChange={(e) => setLinkedIn(e.target.value)}
          placeholder="linkedin.com/in/username"
          className={monoInputClass}
        />
      </div>
    </div>
  );
};
