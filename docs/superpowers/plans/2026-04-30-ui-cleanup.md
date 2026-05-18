# Modern Framed UI Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the current full-screen map into a modern, framed "Solid Pro" interface with a gunmetal/slate palette, featuring a dedicated header, sidebar filters, and a map card that occupies the right 2/3 of the screen.

**Architecture:** 
- Establish a global grid layout in the root page to frame the application.
- Decouple overlays from the `MapView` and move them into a managed UI layout in `MapClientWrapper`.
- Transition the visual style from "Glassmorphism" to a solid, high-contrast professional look using gunmetal/slate grays.
- Implement a conditional layout for the area beneath the map that displays arc details when an item is selected.

**Tech Stack:** Next.js (App Router), Tailwind CSS (for layout/styling), Lucide React (for icons), DeckGL/Mapbox.

---

### Task 1: Global Theme and Layout Shell

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update Global CSS with "Solid Pro" Palette**

```css
:root {
  --color-surface: #0f172a; /* Slate 950 */
  --color-surface-container: #1e293b; /* Slate 800 */
  --color-surface-container-high: #334155; /* Slate 700 */
  --color-on-surface: #f8fafc; /* Slate 50 */
  --color-on-surface-variant: #94a3b8; /* Slate 400 */
  --color-outline: #475569; /* Slate 600 */
  --color-primary: #0ea5e9; /* Sky 500 */
  --color-primary-container: #0c4a6e; /* Sky 900 */
}

body {
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  overflow: hidden;
}
```

- [ ] **Step 2: Define the Main Layout Shell in `app/page.tsx`**

```tsx
import MapClientWrapper from "@/components/MapClientWrapper";

export default function Home() {
  return (
    <main className="h-screen w-screen flex flex-col bg-surface overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-outline/20 flex items-center px-6 shrink-0">
        <h1 className="font-headline font-bold text-lg tracking-tight text-on-surface">
          Aus Export Tracker
        </h1>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        <MapClientWrapper />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/page.tsx app/layout.tsx
git commit -m "style: establish solid pro theme and layout shell"
```

---

### Task 2: Refactor `MapClientWrapper` for Framed Layout

**Files:**
- Modify: `components/MapClientWrapper.tsx`
- Create: `components/DetailsPane.tsx`

- [ ] **Step 1: Update Layout Grid in `MapClientWrapper`**
Adjust the return statement to use a flex layout: Left sidebar (1/3 or fixed) and Map Card (2/3).

```tsx
// Inside MapClientWrapper return
return (
  <>
    {/* Left Column: Filters */}
    <aside className="w-[320px] flex flex-col gap-4 overflow-y-auto pr-2">
      <TradeFiltersPanel
        resources={resources}
        countries={countries}
        onToggleResource={handleToggle}
        onToggleCountry={handleCountryToggle}
        onSelectAllResources={handleSelectAllResources}
        onDeselectAllResources={handleDeselectAllResources}
        onSelectAllCountries={handleSelectAllCountries}
        onDeselectAllCountries={handleDeselectAllCountries}
      />
    </aside>

    {/* Right Column: Map Card & Details */}
    <div className="flex-1 flex flex-col gap-4 min-w-0">
      <div className="flex-1 bg-surface-container rounded-2xl border border-outline/20 overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 left-0 right-0 z-10">
           <YearRangeBar
              minYear={globalMinYear}
              maxYear={globalMaxYear}
              startYear={startYear}
              endYear={endYear}
              onRangeChange={handleRangeChange}
            />
        </div>
        <MapView
          arcs={filteredArcs}
          onArcHover={handleArcHover}
          onArcClick={handleArcClick}
        />
        <MapLegend />
      </div>

      {/* Conditional Details Pane / Placeholder */}
      <div className="h-64 bg-surface-container rounded-2xl border border-outline/20 p-6 shadow-xl">
        {selectedArc ? (
          <DetailsPane arc={selectedArc} yearLabel={yearLabel} onClose={() => setSelectedArc(null)} />
        ) : (
          <div className="h-full flex items-center justify-center text-on-surface-variant/40 italic">
            Select an export route on the map to view details
          </div>
        )}
      </div>
    </div>

    {hover && (
      <ArcTooltip arc={hover.arc} x={hover.x} y={hover.y} />
    )}
  </>
);
```

- [ ] **Step 2: Create `DetailsPane` (Replacing `SidePanel`)**
Refactor logic from `SidePanel.tsx` into a horizontally-oriented pane for the bottom area.

- [ ] **Step 3: Commit**

```bash
git add components/MapClientWrapper.tsx components/DetailsPane.tsx
git commit -m "feat: implement framed layout with side filters and bottom details area"
```

---

### Task 3: Component Visual Refresh (Solid Pro Style)

**Files:**
- Modify: `components/TradeFiltersPanel.tsx`
- Modify: `components/YearRangeBar.tsx`
- Modify: `components/MapLegend.tsx`

- [ ] **Step 1: Refresh `TradeFiltersPanel`**
Remove `glass-panel` classes. Use solid `bg-surface-container` and `border-outline/20`. Increase width/spacing for better readability in the sidebar.

- [ ] **Step 2: Refresh `YearRangeBar`**
Make it a solid header within the map card. Adjust colors to match gunmetal palette.

- [ ] **Step 3: Refresh `MapLegend`**
Move it from absolute overlay to a integrated element or a more discreet overlay within the card.

- [ ] **Step 4: Commit**

```bash
git add components/TradeFiltersPanel.tsx components/YearRangeBar.tsx components/MapLegend.tsx
git commit -m "style: update components to solid pro visual style"
```

---

### Task 4: Cleanup and Verification

- [ ] **Step 1: Remove `components/SidePanel.tsx` (Obsolete)**
- [ ] **Step 2: Verify Responsive Behaviour**
Ensure the layout doesn't break on smaller screens (though this is targeted at a desktop/pro dashboard view).
- [ ] **Step 3: Final Type Check**
Run `npm run build` or `tsc` to ensure no broken imports or props.
- [ ] **Step 4: Commit**

```bash
git rm components/SidePanel.tsx
git commit -m "cleanup: remove obsolete SidePanel component"
```
