import React from 'react';
import { ExternalLink, Globe, Plus, Trash2 } from 'lucide-react';
import { SettingsCard } from '../../SettingsCard';
import { CandidateProfile, CandidateLink } from '../../../../types';

export interface AutofillOnlineProfilesCardProps {
  data: Partial<CandidateProfile>;
  onChange: <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => void;
}

const MAX_ADDITIONAL_LINKS = 8;

const LINK_SUGGESTIONS = [
  'Dribbble',
  'Behance',
  'ArtStation',
  'GitHub',
  'GitLab',
  'Medium',
  'Substack',
  'Notion',
  'Stack Overflow',
  'Google Scholar',
  'ORCID',
  'ResearchGate',
  'Kaggle',
  'IMDb',
  'YouTube',
  'Vimeo',
  'X / Twitter',
  'Personal Website',
];

const DOMAIN_LABELS: Record<string, string> = {
  'dribbble.com': 'Dribbble',
  'behance.net': 'Behance',
  'artstation.com': 'ArtStation',
  'github.com': 'GitHub',
  'gitlab.com': 'GitLab',
  'medium.com': 'Medium',
  'substack.com': 'Substack',
  'notion.so': 'Notion',
  'notion.site': 'Notion',
  'stackoverflow.com': 'Stack Overflow',
  'scholar.google.com': 'Google Scholar',
  'orcid.org': 'ORCID',
  'researchgate.net': 'ResearchGate',
  'kaggle.com': 'Kaggle',
  'imdb.com': 'IMDb',
  'youtube.com': 'YouTube',
  'vimeo.com': 'Vimeo',
  'x.com': 'X',
  'twitter.com': 'X',
};

function normalizeUrlValue(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function inferLinkLabel(url: string): string {
  if (!url) return '';
  try {
    const host = new URL(normalizeUrlValue(url)).hostname.replace(/^www\./i, '').toLowerCase();
    for (const [domain, label] of Object.entries(DOMAIN_LABELS)) {
      if (host === domain || host.endsWith(`.${domain}`)) return label;
    }
    const firstSegment = host.split('.')[0];
    return firstSegment ? firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1) : '';
  } catch {
    return '';
  }
}

function makeLinkId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `link_${crypto.randomUUID()}`;
    }
  } catch {
    // Ignore and fall through to timestamp id
  }
  return `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const inputClass =
  'w-full h-9 px-3 text-base sm:text-sm bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors';

/**
 * AutofillOnlineProfilesCard
 *
 * Universal online presence editor for all job seekers:
 * - LinkedIn + primary Portfolio / Website stay platform-neutral.
 * - Additional links are a free-form repeater so designers, writers,
 *   researchers, and engineers can surface Dribbble, Behance, Scholar, etc.
 * - Labels are inferred from the URL domain when left blank.
 */
export const AutofillOnlineProfilesCard: React.FC<AutofillOnlineProfilesCardProps> = ({ data, onChange }) => {
  const additionalLinks = Array.isArray(data.additionalLinks) ? data.additionalLinks : [];

  const normalizeSocialOnBlur = (field: 'linkedInUrl' | 'portfolioUrl', value?: string) => {
    const normalized = normalizeUrlValue(value);
    if (normalized && normalized !== value) onChange(field, normalized);
  };

  const updateLink = (index: number, patch: Partial<CandidateLink>) => {
    onChange(
      'additionalLinks',
      additionalLinks.map((link, i) => (i === index ? { ...link, ...patch } : link))
    );
  };

  const handleLinkUrlBlur = (index: number, value?: string) => {
    const url = normalizeUrlValue(value);
    const current = additionalLinks[index];
    const label = current?.label?.trim() || inferLinkLabel(url);
    updateLink(index, { url, label });
  };

  const addLink = () => {
    if (additionalLinks.length >= MAX_ADDITIONAL_LINKS) return;
    onChange('additionalLinks', [...additionalLinks, { id: makeLinkId(), label: '', url: '' }]);
  };

  const removeLink = (index: number) => {
    onChange(
      'additionalLinks',
      additionalLinks.filter((_, i) => i !== index)
    );
  };

  return (
    <SettingsCard
      title="Online Presence & Portfolios"
      subtitle="Add any profile that represents your work — Dribbble, Behance, GitHub, Medium, Scholar, or a personal site."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* LinkedIn Profile */}
        <div className="space-y-1.5">
          <label htmlFor="linkedin-url" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>LinkedIn URL</span>
          </label>
          <input
            id="linkedin-url"
            type="url"
            value={data.linkedInUrl || ''}
            onChange={(e) => onChange('linkedInUrl', e.target.value)}
            onBlur={(e) => normalizeSocialOnBlur('linkedInUrl', e.target.value)}
            placeholder="https://linkedin.com/in/username"
            className={inputClass}
          />
        </div>

        {/* Portfolio / Website */}
        <div className="space-y-1.5">
          <label htmlFor="portfolio-url" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>Portfolio / Website</span>
          </label>
          <input
            id="portfolio-url"
            type="url"
            value={data.portfolioUrl || ''}
            onChange={(e) => onChange('portfolioUrl', e.target.value)}
            onBlur={(e) => normalizeSocialOnBlur('portfolioUrl', e.target.value)}
            placeholder="https://yourportfolio.com"
            className={inputClass}
          />
        </div>
      </div>

      {/* Additional Links (free-form, platform-neutral) */}
      <div className="pt-4 mt-2 border-t border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">Additional Links</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Add a label and URL. Leave the label blank to infer it from the domain.
            </p>
          </div>
          <button
            type="button"
            onClick={addLink}
            disabled={additionalLinks.length >= MAX_ADDITIONAL_LINKS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add link</span>
            <span className="text-slate-400 font-normal">
              {additionalLinks.length}/{MAX_ADDITIONAL_LINKS}
            </span>
          </button>
        </div>

        <datalist id="candidate-link-suggestions">
          {LINK_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>

        {additionalLinks.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            No additional links yet. Designers often add Dribbble or Behance; writers add Medium or Substack.
          </p>
        ) : (
          <div className="space-y-2">
            {additionalLinks.map((link, index) => (
              <div
                key={link.id || `link-${index}`}
                className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)_auto] gap-2 items-center"
              >
                <input
                  type="text"
                  list="candidate-link-suggestions"
                  value={link.label || ''}
                  onChange={(e) => updateLink(index, { label: e.target.value })}
                  aria-label={`Additional link ${index + 1} label`}
                  placeholder="Label (e.g. Dribbble)"
                  className={inputClass}
                />
                <input
                  type="url"
                  value={link.url || ''}
                  onChange={(e) => updateLink(index, { url: e.target.value })}
                  onBlur={(e) => handleLinkUrlBlur(index, e.target.value)}
                  aria-label={`Additional link ${index + 1} URL`}
                  placeholder="https://dribbble.com/username"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  aria-label={`Remove additional link ${index + 1}`}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsCard>
  );
};
