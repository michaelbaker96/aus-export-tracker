# Modern Framed UI Cleanup - Task 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a structured dashboard layout with a fixed sidebar for filters, a centered map card, and a bottom details area that replaces the floating side panel.

**Architecture:** Refactor `MapClientWrapper` into a grid-like layout with a defined sidebar and main column. Create `DetailsPane` to display selected arc data horizontally at the bottom of the main column.

**Tech Stack:** Next.js (TypeScript), React, Tailwind CSS.

---

### Task 1: Create DetailsPane component

**Files:**
- Create: `components/DetailsPane.tsx`

- [ ] **Step 1: Implement DetailsPane with horizontal layout**
  Extract logic from `SidePanel.tsx` and adapt it for a horizontal bottom pane. Include pirate-themed comment.

### Task 2: Refactor MapClientWrapper layout

**Files:**
- Modify: `components/MapClientWrapper.tsx`

- [ ] **Step 1: Implement new flex/grid layout in MapClientWrapper**
  Structure:
  - Sidebar (left, 320px)
  - Main Column (right, flex-1)
    - Map Card (top, flex-1)
    - Details Pane (bottom, h-64)
  Move `YearRangeBar` inside Map Card header.

### Task 3: Adjust TradeFiltersPanel for Sidebar

**Files:**
- Modify: `components/TradeFiltersPanel.tsx`

- [ ] **Step 1: Update TradeFiltersPanel width and styling**
  Make it fill the sidebar width and adjust its background to match the new framed look if necessary.

### Task 4: Cleanup and Verification

- [ ] **Step 1: Remove redundant SidePanel usage**
  Ensure `SidePanel` is no longer used in `MapClientWrapper`.

- [ ] **Step 2: Verify layout and interactions**
  Ensure clicking an arc updates the `DetailsPane` and all filters still work.
