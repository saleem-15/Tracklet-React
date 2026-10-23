# Quickstart: Public Legal & Trust Pages (/privacy, /terms)

**Branch**: `add_legal_trust_pages`  
**Date**: 2026-10-23  
**Status**: Completed  
**Spec Reference**: [spec.md](./spec.md)

---

## Overview

This guide walks through testing and verifying the public legal pages (`/privacy` and `/terms`) in both authenticated and unauthenticated browser contexts, as well as verifying link entry points across the web app and Chrome Extension.

---

## Verification Steps

### 1. Direct Unauthenticated Navigation (Incognito / Fresh Session)
1. Open a new private/incognito browser window.
2. Navigate directly to `http://localhost:3000/privacy`.
   - **Expected**: The Privacy Policy document renders immediately with header, document tabs, table of contents, and footer. The user is **NOT** redirected to `/login`.
   - **Expected Title**: `Privacy Policy | Tracklet`
3. Click the "Terms of Service" tab in the header.
   - **Expected**: The view smoothly transitions to the Terms of Service.
   - **Expected URL**: URL bar updates to `http://localhost:3000/terms`.
   - **Expected Title**: `Terms of Service | Tracklet`
4. Click the "Back" button in the browser.
   - **Expected**: Returns to Privacy Policy and URL bar updates to `/privacy`.

### 2. Header & Auth Actions
1. In the unauthenticated state, check the top navigation right side:
   - **Expected**: Displays a clean "Sign In" button linking to `/login`.
2. Click "Sign In":
   - **Expected**: Navigates to `/login`.
3. Sign in to an account.
4. Manually navigate back to `http://localhost:3000/privacy`.
   - **Expected**: Page renders cleanly; top navigation now displays "Back to Dashboard" or "Go to Workspace" button.
5. Click "Back to Dashboard":
   - **Expected**: Smoothly returns to the active applications pipeline without page reload.

### 3. Entry Points Verification
1. **Signup Page (`/signup`)**:
   - Check the legal consent copy above/below the submit button.
   - Click "Terms of Service": opens `/terms` in a new tab.
   - Click "Privacy Policy": opens `/privacy` in a new tab.
2. **Login Page (`/login`)**:
   - Check the bottom footer: "Privacy" and "Terms" links exist and open `/privacy` and `/terms`.
3. **Settings > Security & Privacy**:
   - Click "Review Privacy & Terms": offers direct option to view standalone `/privacy` and `/terms` pages.
4. **Chrome Extension**:
   - Open extension popup: verify Privacy Policy link is available.

### 4. Accessibility & Print Verification
1. Open `/privacy` and trigger print dialog (`Ctrl+P` or `Cmd+P` or click "Print Document"):
   - **Expected**: Headers, buttons, and sidebars are hidden; typography formats cleanly across standard letter/A4 pages.
2. Test keyboard navigation: Tab key navigates across tabs, TOC links, and headings cleanly with clear focus rings.
