# Data Model & Contracts: Public Legal & Trust Pages (/privacy, /terms)

**Branch**: `add_legal_trust_pages`  
**Date**: 2026-10-23  
**Status**: Completed  
**Spec Reference**: [spec.md](./spec.md)

---

## 1. Type Definitions & Route Contracts

Public legal and trust pages do not introduce new persistent Firestore collections or modify database schemas, as legal covenants are published static documents. The TypeScript contracts govern document navigation, routing, and table of contents models.

### `LegalDocType`
```typescript
/**
 * Supported legal and trust document types.
 */
export type LegalDocType = 'privacy' | 'terms';
```

### `LegalSection`
```typescript
/**
 * Represents a navigable section anchor within a legal document.
 */
export interface LegalSection {
  id: string;
  title: string;
}
```

### Route Mappings (`src/lib/routeUtils.ts`)
```typescript
export const LEGAL_PATH_TO_DOC: Record<string, LegalDocType> = {
  '/privacy': 'privacy',
  '/privacy-policy': 'privacy',
  '/terms': 'terms',
  '/terms-of-service': 'terms',
  '/tos': 'terms',
  '/legal': 'privacy',
};

export const DOC_TO_LEGAL_PATH: Record<LegalDocType, string> = {
  privacy: '/privacy',
  terms: '/terms',
};
```

---

## 2. Component Interface Contracts

### `LegalViewProps`
```typescript
export interface LegalViewProps {
  initialDoc?: LegalDocType;
  onNavigateHome?: () => void;
}
```

### `LegalNavbarProps`
```typescript
export interface LegalNavbarProps {
  activeDoc: LegalDocType;
  onSelectDoc: (doc: LegalDocType) => void;
  isAuthenticated: boolean;
  onNavigateHome: () => void;
}
```

### `LegalTableOfContentsProps`
```typescript
export interface LegalTableOfContentsProps {
  sections: LegalSection[];
  activeSectionId: string;
  onSectionClick: (id: string) => void;
}
```

---

## 3. Extension Manifest Contract

No new permissions are requested in `extension/manifest.json`. The extension relies on `chrome.tabs.create` or standard link anchors with `target="_blank" rel="noopener noreferrer"` to open `https://<domain>/privacy`.
