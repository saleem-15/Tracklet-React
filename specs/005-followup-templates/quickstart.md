# Quickstart & Verification Guide: Follow-Up Templates

**Feature**: 005-followup-templates | **Date**: 2026-09-05

## Overview

This guide walks through testing and verifying the Follow-Up Engine across both primary touchpoints:
1. **The In-Context Follow-Up Launcher Modal** (Application QuickLinks and Contact cards)
2. **The Follow-Up Template Library Management** (In-modal editor and Settings section)

---

## 1. Quick Verification Flow

### Test Case 1: 1-Click Follow-Up Launcher
1. Open Tracklet at `http://localhost:3001/` (or active dev server).
2. Click on the **Linear** application in the pipeline board or table.
3. In the right column under **Primary Contact**, click the **"Follow-up"** button.
4. Verify the modal opens with:
   - Recruiter **Karla Lindqvist** selected.
   - 4 built-in template tabs / pills.
   - Dynamic subject and body preview with variables replaced (`Linear`, `Senior Frontend Engineer`, `Karla`).
5. Click **"Copy Text"**:
   - Verify toast confirmation appears.
   - Verify clipboard contains the fully interpolated email text.
6. Verify the 5-day reminder task checkbox:
   - When checked and copied/opened, verify a new task appears under **Tasks**: `"Follow up with Karla Lindqvist if no response"` due in 5 days.

---

### Test Case 2: Contact Card Follow-Up
1. In the **Contacts** section of the detail panel, hover over a contact (e.g., Tuomas Artman).
2. Verify a dedicated **"Follow-up"** button appears.
3. Click it and verify the recipient automatically locks to Tuomas Artman with his email.

---

### Test Case 3: Template Customization & Freedom
1. Inside the Follow-Up modal, click **"Manage Templates"** (or navigate to **Settings $\rightarrow$ Follow-Up Templates**).
2. Click **"+ New Template"**:
   - Title: `Casual Check-in`
   - Subject: `Coffee or quick chat regarding {role}?`
   - Body: `Hey {contactName}, loving what {company} is doing lately...`
3. Click **"Save Template"**.
4. Return to the Follow-up modal: verify `Casual Check-in` is selectable and interpolates properly.
5. Click **"Reset to Defaults"**: verify factory defaults are reloaded while custom templates remain intact.
