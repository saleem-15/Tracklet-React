import React, { useState, useEffect, useRef } from 'react';
import { useCandidateProfile } from '../../../hooks/useCandidateProfile';
import { useAuth } from '../../../context/AuthContext';
import { useToastContext } from '../../../context/ToastContext';
import { CandidateProfile } from '../../../types';
import { AutofillCompletenessHeader } from './autofill/AutofillCompletenessHeader';
import { AutofillContactCard } from './autofill/AutofillContactCard';
import { AutofillWorkAuthCard } from './autofill/AutofillWorkAuthCard';
import { AutofillExperienceCard } from './autofill/AutofillExperienceCard';
import { AutofillCompensationCard } from './autofill/AutofillCompensationCard';
import { AutofillOnlineProfilesCard } from './autofill/AutofillOnlineProfilesCard';
import { AutofillSnippetsCard } from './autofill/AutofillSnippetsCard';
import { Check } from 'lucide-react';

/**
 * AutofillProfilePane
 *
 * Dedicated section for candidate career targeting and Chrome Extension ATS autofill.
 * Synchronizes with Firestore users/{userId}/profile/candidate and extension storage.
 * Powers automated form-filling on Greenhouse, Lever, Ashby, and Workday.
 */
export const AutofillProfilePane: React.FC = () => {
  const { profile, saveProfile, isSaving } = useCandidateProfile();
  const { user } = useAuth();
  const { addToast } = useToastContext();

  const [formData, setFormData] = useState<Partial<CandidateProfile>>(() => {
    const derivedFirst = profile?.firstName || (user?.displayName ? user.displayName.split(' ')[0] : '');
    const derivedLast = profile?.lastName || (user?.displayName ? user.displayName.split(' ').slice(1).join(' ') : '');

    return {
      ...profile,
      firstName: derivedFirst,
      lastName: derivedLast,
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      workAuth: profile?.workAuth || {
        isLegallyAuthorized: true,
        requiresSponsorship: false,
        currentStatus: profile?.workAuthorization || 'Citizen / Permanent Resident',
      },
      noticePeriod: profile?.noticePeriod || '2_weeks',
      relocationPreference: profile?.relocationPreference || 'remote_only',
      experience: profile?.experience || {
        currentTitle: '',
        currentCompany: '',
      },
      targetTitles: profile?.targetTitles || [],
      salaryTarget: profile?.salaryTarget || { currency: 'USD' },
      linkedInUrl: profile?.linkedInUrl || '',
      githubUrl: profile?.githubUrl || '',
      portfolioUrl: profile?.portfolioUrl || '',
      additionalLinks: profile?.additionalLinks || [],
      bioSnippet: profile?.bioSnippet || '',
      coverLetterSnippet: profile?.coverLetterSnippet || '',
    };
  });

  const [hasSaved, setHasSaved] = useState(false);
  const lastSyncTimeRef = useRef(profile?.updatedAt);

  // Sync only if remote profile actually updated
  useEffect(() => {
    if (profile && profile.updatedAt && profile.updatedAt !== lastSyncTimeRef.current) {
      lastSyncTimeRef.current = profile.updatedAt;
      setFormData((prev) => ({
        ...prev,
        ...profile,
      }));
    }
  }, [profile]);

  const updateField = <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const derivedFullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || formData.fullName;
      const success = await saveProfile({
        ...formData,
        fullName: derivedFullName,
        updatedAt: new Date().toISOString(),
      });

      if (success) {
        setHasSaved(true);
        setTimeout(() => setHasSaved(false), 2500);
        addToast('success', 'Autofill Profile Saved', 'Updated target profile for Chrome Extension ATS autofill.');
      }
    } catch {
      addToast('error', 'Save Failed', 'Could not save profile changes.');
    }
  };

  return (
    <form noValidate onSubmit={handleSaveProfile} className="space-y-0">
      {/* ── 1. Profile Readiness Progress Header ── */}
      <AutofillCompletenessHeader profile={formData} />

      {/* ── 2. Personal & Contact Details ── */}
      <AutofillContactCard data={formData} onChange={updateField} />

      {/* ── 3. Work Authorization & Availability ── */}
      <AutofillWorkAuthCard data={formData} onChange={updateField} />

      {/* ── 4. Current Role & Experience ── */}
      <AutofillExperienceCard data={formData} onChange={updateField} />

      {/* ── 5. Salary & Compensation Expectations ── */}
      <AutofillCompensationCard data={formData} onChange={updateField} />

      {/* ── 6. Online Presence & Portfolios ── */}
      <AutofillOnlineProfilesCard data={formData} onChange={updateField} />

      {/* ── 7. Bio & Application Snippets ── */}
      <AutofillSnippetsCard data={formData} onChange={updateField} />

      {/* ── Sticky / Clean Action Bar ── */}
      <div className="flex items-center justify-end pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Saved!</span>
            </>
          ) : isSaving ? (
            <span>Saving...</span>
          ) : (
            <span>Save Autofill Profile</span>
          )}
        </button>
      </div>
    </form>
  );
};
