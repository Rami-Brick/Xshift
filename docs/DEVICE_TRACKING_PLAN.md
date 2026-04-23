# Device Tracking for Attendance Fraud Detection

## Overview

This document describes a plan to attach a **device identifier** to each attendance entry. The goal is to give the admin a simple visual reference per entry so that patterns like *two different employees marking attendance from the same device on the same day* can be spotted and flagged as potential fraud.

This is a **forensic/audit approach** — it does not block fraud in real time, but it makes it detectable and provable after the fact.

---

## Problem Statement

The current attendance system verifies that the employee is at the correct geolocation before marking presence. However, a single employee who is physically present at headquarters could log into multiple colleagues' accounts and mark them all as present, while those colleagues are elsewhere.

Location verification alone cannot solve this because the fraud happens from the same legitimate location.

---

## Proposed Solution

### Core Idea

When an employee marks their attendance, the app generates (or retrieves) a **persistent device ID** stored in the browser's `localStorage`. This ID is sent along with the attendance submission and stored in the database. The admin can then see, per entry, which device it was submitted from.

### What the Admin Sees

Each attendance entry in the admin panel will show a short, human-readable device reference. Example:

| Employee | Date | Status | Device |
|---|---|---|---|
| Alice Martin | 2026-04-23 | Present | iPhone · Safari — #A3F7 |
| Bob Dupont | 2026-04-23 | Present | iPhone · Safari — #A3F7 |
| Carol Smith | 2026-04-23 | Present | Android · Chrome — #B91C |

In the example above, Alice and Bob share the same device reference (`#A3F7`), which is a clear fraud signal.

The short code (e.g., `#A3F7`) is the last 4 characters of the UUID — readable and comparable at a glance without being overwhelming.

---

## Technical Plan

### 1. Device ID Generation (Frontend)

**Location:** the utility that runs on app load, before the attendance form is rendered.

**Logic:**
```
On app load:
  if localStorage["xshift_device_id"] exists:
    use it
  else:
    generate a new UUID v4
    store it in localStorage["xshift_device_id"]
```

**Display label:**
```
Combine:
  - navigator.userAgent parsed to extract: device type (iPhone / Android / Desktop) + browser name (Safari / Chrome / Firefox)
  - Last 4 chars of the UUID as the short code

Result: "iPhone · Safari — #A3F7"
```

The display label is assembled on the client and sent as-is. No complex fingerprinting. No sensitive data.

### 2. Sending Device Info with Attendance Submission (Frontend → API)

When the employee submits their attendance mark, include two additional fields in the request body:

```json
{
  "device_id": "a1b2c3d4-e5f6-...",
  "device_label": "iPhone · Safari — #A3F7"
}
```

`device_id` is the full UUID (stored in DB for querying).
`device_label` is the human-readable string (stored in DB for display).

### 3. Database Changes

Add two columns to the attendance records table (likely `attendances` or equivalent):

```sql
ALTER TABLE attendances
  ADD COLUMN device_id TEXT,
  ADD COLUMN device_label TEXT;
```

Both are nullable — existing records without device info will simply show "Unknown device" in the UI.

### 4. API Changes (Backend)

The attendance submission endpoint should:
- Accept the two new optional fields (`device_id`, `device_label`) from the request body
- Persist them alongside the attendance record
- No validation required beyond basic length sanity check — these are audit fields, not security controls

### 5. Admin UI Changes

In the attendance history / entries view:

- Add a **Device** column to the entries table
- Show `device_label` if present, otherwise show `—`
- Optionally: highlight in amber/orange any `device_id` that appears for more than one employee on the same day (fraud pattern indicator)

The highlighting is optional but high value — it turns a manual visual check into an automated flag.

---

## Fraud Detection Query (Optional Enhancement)

A query the backend can run daily (or on demand) to surface suspicious entries:

```sql
SELECT device_id, COUNT(DISTINCT employee_id) AS employee_count, array_agg(DISTINCT employee_id) AS employees
FROM attendances
WHERE date = CURRENT_DATE
GROUP BY device_id
HAVING COUNT(DISTINCT employee_id) > 1;
```

This returns any device that was used by more than one employee on the current day. Results can be surfaced as an admin alert or dashboard warning.

---

## Limitations and Honest Assessment

| Scenario | Handled? |
|---|---|
| One person marks attendance for multiple colleagues from their phone | Yes — same device_id appears for multiple employees |
| Attacker clears browser localStorage before each login | No — a fresh UUID is generated each time |
| Attacker uses a different browser per employee | No — each browser has its own localStorage |
| Two employees who genuinely share a device (rare) | False positive — admin must use judgment |

**Conclusion:** This approach reliably catches lazy or unsophisticated fraud (the most common case). It does not catch a determined attacker who deliberately clears storage or uses different browsers — but that level of effort significantly raises the cost of the fraud.

For the target use case (small-to-medium business, non-technical workforce), this is the right tradeoff: **zero friction for honest employees, meaningful deterrent and audit trail against casual fraud.**

---

## Implementation Checklist (for the AI Agent)

The following tasks should be executed in order:

- [ ] **Step 1 — Database migration:** Add `device_id` (TEXT, nullable) and `device_label` (TEXT, nullable) columns to the attendances table. Write and apply a migration file.

- [ ] **Step 2 — Frontend utility:** Create a `getDeviceId()` utility function that reads from or initializes `localStorage["xshift_device_id"]`. Create a `getDeviceLabel()` function that combines the parsed user agent with the short code.

- [ ] **Step 3 — Attendance submission:** Update the attendance mark API call to include `device_id` and `device_label` in the request payload.

- [ ] **Step 4 — API endpoint:** Update the attendance submission route to accept and persist `device_id` and `device_label`.

- [ ] **Step 5 — Admin UI:** Add a Device column to the attendance entries table. Display `device_label`. Highlight rows where the `device_id` appears for more than one employee on the same day (optional but recommended).

- [ ] **Step 6 — (Optional) Fraud alert:** Add a backend query or scheduled check that surfaces same-day device collisions as an admin notification or dashboard badge.

---

## Files Likely to Be Modified

> These are approximate — the agent should verify exact paths by exploring the codebase.

| Area | File(s) |
|---|---|
| DB migration | `supabase/migrations/` — new migration file |
| Device utility | `src/lib/device.ts` (new file) |
| Attendance API call | Wherever the attendance mark POST is made (likely in a component or a lib/api file) |
| Attendance API route | `src/app/api/attendances/route.ts` or similar |
| Admin entries view | `src/app/(admin)/admin/attendances/` or similar |
| Types | `src/types/index.ts` — add `device_id` and `device_label` to the attendance type |

---

## Out of Scope

- Real-time blocking of attendance from a device already used by another employee that day
- Biometric verification
- Complex browser fingerprinting
- Mobile app native device ID (this plan assumes a web app)
