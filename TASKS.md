# Implementation Tasks — UX Improvement Plan

Derived from the UX assessment of this codebase. Nothing here is implemented yet.

**Scope:** frontend only. `localStorage` is the only persistence (per `AGENTS.md`).
**Priority:** `P0` breaks trust · `P1` high impact · `P2` polish and consistency
**Gate:** `npm run lint` and `npm run typecheck` pass before any task is done.

---

## The problem being solved

The app looks like a working system but most controls are inert. A user who taps
"Send to kitchen" and nothing happens concludes the app is broken and stops looking.
Everything below is ordered so that trust is restored first and polish follows.

---

## Phase 0 — Two decisions (5 minutes, unblocks the rest)

| ID | Decision | Why it matters |
|----|----------|----------------|
| **0.1** | Is this a **demo** or a **real app**? If a demo, make the fakery *legible* — disable unwired controls rather than leaving them inert. If real, Phase 4 grows substantially. | Changes the size of Phase 1 and whether Phase 4 exists |
| **0.2** | Keep or delete the 4 unrouted auth pages (`Login`, `Register`, `ForgotPassword`, `ResetPassword`)? Nothing links to them; `AuthContext` is never mounted; `localAuth.js` is never called. | 443 lines of dead code, and it decides whether there's any user identity at all |

---

## Phase 1 — Restore trust

### 1a. One source of truth

Eight pages hold private `useState` copies, so screens contradict each other.

| ID | Task | Scope | Done when |
|----|------|-------|-----------|
| **1.1** | Add a store for domain data that pages read and write, replacing the private copies | new `src/lib/DataContext.jsx` | No page imports `mockData.js` directly |
| **1.2** | Persist the store to `localStorage` under one namespaced key, seeding from `mockData` when absent | store + key | An order created in 1.6 survives reload |
| **1.3** | Fix cross-screen divergence: Kitchen availability → New Order; notification read → topbar badge; cleaner task completion → Cleaning | `MenuAvailability`, `NewOrder`, `Menu`, `Notifications`, `Layout.jsx:77`, `MyTasks`, `Cleaning`, `TableQueue` | Kitchen marks Kitfo unavailable → New Order shows it unavailable |
| **1.4** | Wire `toast()` into real mutations. The `Toaster` is mounted at `App.jsx:93` but never called | 11 modal pages + 8 mutation pages | Every success gives visible confirmation |
| **1.5** | Add pending and error states to mutations. Nothing is async today, so nothing has in-flight state | mutation sites | Submit disables while in flight, re-enables on failure |

### 1b. Wire the controls that lie

Ordered by how visible the lie is.

| ID | Task | Location | What's wrong |
|----|------|----------|--------------|
| **1.6** | Order creation actually creates an order | `NewOrder.jsx:148-157` | Shows "Ticket sent to kitchen", creates nothing. Table stays Available |
| **1.7** | Cancel order, with the reason the label already demands | `OrderDetail.jsx:94` | Button has **no `onClick` at all** |
| **1.8** | "Save changes" persists | `Settings.jsx:24` | No handler; fields use `defaultValue`, typed input discarded |
| **1.9** | Purchase approve / reject / mark-reviewed / receive | `Purchases.jsx:61-66` | All four handlerless |
| **1.10** | Resolve incident | `Incidents.jsx:30` | No `onClick` |
| **1.11** | Change password + report issue | `Profile.jsx:34, 47-58` | No submit handler; inputs uncontrolled |
| **1.12** | Claim lost-found item | `LostFound.jsx:33-40` | Fields have no `value`/`onChange`; Confirm only closes |
| **1.13** | Bind every modal input missing `value`/`onChange` | `Users`, `Expenses`, `Inventory`, `Reservations`, `Menu` | Typing does literally nothing |
| **1.14** | Apply discount / record payment | `OrderDetail.jsx:92-93, 158-176` | "Apply" only closes; "Record payment" navigates to the same URL |
| **1.15** | Give `Reports.jsx` real data; make date filters drive it | `Reports.jsx` | Entirely hardcoded; filters read by nothing; "Export CSV" (`:45`) and "Download PDF" (`:122`) do nothing |
| **1.16** | Derive dashboard net sales | `Dashboard.jsx:67` | Literal string `"14,820"` among four derived siblings |
| **1.17** | Header buttons on `Employees`, `Suppliers`, `Maintenance`, `Cleaning`, `Reservations`, `Tables` | as noted | No handlers |

### 1c. Data coherence

Users read these as wrong data, not missing features.

| ID | Task | Problem |
|----|------|---------|
| **1.18** | Fix `E01`–`E05` id collision between `expenses` and `employees` | Two entity types share an id prefix |
| **1.19** | Fix PO referencing supplier `"Aqua Addis"`, absent from `suppliers` | Dangling reference |
| **1.20** | Reconcile `"Selam"` / `"Dawit"` with `"Selam T."` / `"Dawit M."` and usernames | Three naming conventions for one person |
| **1.21** | Reconcile `"Bottled Water 500ml"` vs `"Bottled Water"` across menu, inventory, movements | Three-way naming mismatch |
| **1.22** | Resolve `hasRecipe: true` on 10 items that have no recipe (only M03/M04/M12 exist) | Either add recipes or correct the flags — currently `Recipes.jsx:11` falls to EmptyState |
| **1.23** | Make dates coherent: banner "Sep 30", charts "Sep 24–29", Reports defaults `2026-09-24`/`30`, hardcoded `"2025-09-30"` in `Dashboard.jsx:26` and `Maintenance.jsx:10,47` | Add a real current-business-date helper rather than editing strings |
| **1.24** | Derive the kitchen delay check from `restaurant.delayThreshold` | `KitchenQueue.jsx:61` hardcodes hour `19` while `:49` displays 20 |
| **1.25** | Vendor the 12 remote menu images into `public/`; give the 5 items sharing one photo distinct images | Violates the offline rule in `AGENTS.md` |

---

## Phase 2 — Navigation and wayfinding

| ID | Task | Problem |
|----|------|---------|
| **2.1** | Fix the dead `/security` link | `Layout.jsx:28` — **no such route**, so the manager's own nav 404s. The real security pages are `/visitors`, `/incidents`, `/lost-found` |
| **2.2** | Group the manager's 18 flat nav items | One undifferentiated list. Try Operations / Finance / Admin |
| **2.3** | Make active state prefix-based | `Layout.jsx:100` is exact string match, so `/orders/new` and `/orders/ORD-0042` highlight nothing |
| **2.4** | Fix the breadcrumb fallback | `Layout.jsx:160` renders the literal word "Page" on every detail screen |
| **2.5** | Add a command palette over `cmdk` (installed, `ui/command.jsx` exists, zero call sites) | Also the natural home for cross-module search, since 13 pages each have a private `SearchInput`. **Role-filter every result** so it can't surface records the current role shouldn't see |
| **2.6** | Route Settings sub-navigation through the URL | `Settings.jsx:7-16` is local state only — not linkable or reload-safe |
| **2.7** | Close the manager's quick-action gaps | Dashboard reaches `/kitchen`, `/incidents`, `/cleaning`, none of which are in its nav |
| **2.8** | Route `/` to the current role's home, not always `/dashboard` | `App.jsx:77` sends a cleaner to the dashboard |

---

## Phase 3 — Design system consistency

| ID | Task | Note |
|----|------|------|
| **3.1** | Delete the 52 unused `ui/` primitives, or adopt them deliberately | Two are already broken: `toogle-group.jsx:6` → nonexistent `toggle`; `sonner.jsx:2` → `next-themes` |
| **3.2** | Fix the `toogle.jsx` / `toogle-group.jsx` filename typo, or remove both | |
| **3.3** | Collapse four parallel variant systems into one | `cva` in `ui/`, the `.btn-*` CSS classes, `shared.jsx` lookup maps, per-page maps (`Tables.jsx:8`, `Dashboard.jsx:28`) |
| **3.4** | Retire ~50 stock `rose/emerald/amber/sky/indigo/slate` classes fighting the warm palette | The same status renders sage in `StatusBadge` and emerald in `Tables.jsx:8-14` |
| **3.5** | Consolidate the ad-hoc type scale into named tokens | `text-[11px]`, `text-[10px]`, `text-[1.75rem]` — ~15 one-offs across `shared.jsx` and `Layout.jsx` |
| **3.6** | Bring `PageNotFound.jsx` into the warm palette | Stock `slate-*`, visually inconsistent |
| **3.7** | Fix palette drift in `manifest.json` and `favicon.svg` | `#F5F0E8` ≠ `--background` `#F7F2E8`; favicon gold `#D2A878` isn't in the `gold` scale |

---

## Phase 4 — Roles and identity

Skip entirely if 0.1 = demo.

| ID | Task | Problem |
|----|------|---------|
| **4.1** | Add per-route role guards | Nav is filtered but routes aren't — a cleaner can hand-type `/reports`, `/settings`, `/users`. No `<Navigate>` guard exists |
| **4.2** | Replace `const isManager = true; // demo` | `OrderDetail.jsx:14` — makes the manager-only discount button universal |
| **4.3** | Decide per page whether copy or code is wrong, then fix the code | Copy promises enforcement that doesn't exist: `Users.jsx:15`, `Orders.jsx:26`, `Expenses.jsx:23`, `Recipes.jsx:17`, `Layout.jsx:41`, `Maintenance.jsx:14` |
| **4.4** | Scope data per role | All roles see byte-identical data today; they differ only in nav list, label and layout chrome |
| **4.5** | Mount `AuthProvider` and route the auth pages, or delete per 0.2 | `AuthContext.jsx` never mounted, `useAuth()` never called |
| **4.6** | Reconcile `localAuth.js` behaviour with its own UI copy | Copy claims "5 failed attempts → 15-min lockout" and "sessions end after 30 min inactivity" (`Users.jsx:57`, `KitchenQueue.jsx:112`, `Profile.jsx:28`); no counter or timer exists. Reset tokens never expire — `requested_at` is written, never checked |
| **4.7** | Fix `signUpWithEmailPassword` hardcoding `role: "user"` | `localAuth.js:73` — not a value in `ROLES` |
| **4.8** | Make security pages reachable by the manager | Manager can reach `/visitors`, `/incidents`, `/lost-found` only via dashboard alert rows |

---

## Phase 5 — Accessibility

Current state: 4 aria attributes in all app code, zero `onKeyDown` handlers, and no focus ring on the button classes used nearly everywhere.

| ID | Task | Problem |
|----|------|---------|
| **5.1** | Escape-to-close + focus trap + `role="dialog"`/`aria-modal` + close button on all 11 modals | Backdrop-click only; no focus restore |
| **5.2** | Real `<form>` elements with submit semantics | Only 4 exist, all in unrouted auth pages; every in-app form is a `<div>` stack |
| **5.3** | Associate labels with inputs | `Users`, `Expenses`, `Inventory`, `LostFound`, `OrderDetail` use sibling `<label>` with no `htmlFor`/`id` — label click does nothing |
| **5.4** | Label `SearchInput` | Placeholder-only accessible name across 13 pages (`shared.jsx:146`) |
| **5.5** | Accessible names on icon-only buttons | Cart +/− (`NewOrder.jsx:125-128`), bell, hamburger, logout (`Layout.jsx:153,163,169,173`), menu edit (`Menu.jsx:71`) |
| **5.6** | Add focus rings to `.btn-soft`/`.btn-primary`/`.btn-outline`/`.btn-ghost`/`.btn-destructive` | `index.css:105-119` — none declared, and these are nearly every action button |
| **5.7** | `scope` on `<th>`, `<caption>` on tables | 7 pages of hand-rolled table markup, none attributed |
| **5.8** | Fix heading order | Modals use `<h3>` directly under `PageHeader`'s `<h1>`, skipping `<h2>` |
| **5.9** | Label the `<nav>` landmarks | `Layout.jsx:98`, `Layout.jsx:188`, `Settings.jsx:26` |
| **5.10** | `role="status"` / `aria-live` on loading and validation feedback | 4 identical error banners, none announced |
| **5.11** | `aria-hidden` the decorative SVG in `PageNotFound.jsx:33` | |

---

## Phase 6 — State display and feedback

| ID | Task | Problem |
|----|------|---------|
| **6.1** | Add `EmptyState` to the 15+ lists that render blank | Used only twice (`Recipes.jsx:56`, `TableQueue.jsx:14`); `Orders.jsx:70` and `KitchenQueue.jsx:100` hand-roll their own |
| **6.2** | Paginate long lists | `ActivityLog`, `Users`, `Inventory` render unbounded. `ui/pagination.jsx` exists, fully accessible, zero call sites |
| **6.3** | Add sorting to data tables | Zero `.sort(` calls in `src/pages/` — everything renders in seed-data order |
| **6.4** | Memoize derived aggregates | Zero `useMemo` in any page; 8+ counters recomputed every render (`Dashboard.jsx:15-26`) |
| **6.5** | Add `overflow-x-auto` to `Users` and `Expenses` tables | 7+ columns, no scroll wrapper (the other 5 tables have one) |
| **6.6** | Replace fake upload divs with real `<input type="file">` | `Settings.jsx:44`, `Expenses.jsx:96`, `Profile.jsx:55` — "Tap to upload" with no input |
| **6.7** | Remove the dead variable summing mixed units | `Inventory.jsx:19` — `totalValue` adds grams + ml + pieces, never rendered |
| **6.8** | Confirmation before destructive actions | Cancel order, reject PO, record waste. `ui/alert.dialog.jsx` exists unused |

---

## Phase 7 — Responsive

| ID | Task | Problem |
|----|------|---------|
| **7.1** | Stop capping cleaner/security at `max-w-md` on large screens | `Layout.jsx:78,181` — `isPhoneRole` is a **role** fork, not a viewport fork |
| **7.2** | Give non-phone roles a usable mobile nav | A manager on a phone gets 18 items behind a hamburger and no bottom bar |
| **7.3** | Height caps and scroll on the 8 modals that have neither | `Users:61`, `Expenses:86`, `Inventory:117`, `Reservations:66`, `LostFound:30`, `OrderDetail:163`, `NewOrder:150` |
| **7.4** | Add responsive prefixes to the 11 pages that have none | `md:` used 0 times in `src/pages/`, `2xl:` 0 times, `xl:` once |
| **7.5** | `overflow-x-auto` on wide tables at small widths | |
| **7.6** | `viewport-fit=cover` + safe-area padding for the bottom nav | `index.html:6` |
| **7.7** | Open Graph / Twitter meta and a `<noscript>` fallback | `index.html` has neither |

---

## Execution order

1. **Phase 0** — 5 minutes, unblocks the rest
2. **1a** — the store is the foundation; nothing else can be coherent without it
3. **1b** — biggest trust gain; split across several PRs if needed
4. **1c** — small, self-contained, independently shippable
5. **Phase 5** — mostly mechanical, and modal/focus work makes the app feel markedly more solid
6. **Phase 2** — biggest single-navigation improvement
7. **Phase 6**, **3**, **7**, **4** — as capacity allows

**If only one thing gets done:** 1a then 1.6. Nothing else matters until tapping
"Send to kitchen" actually sends a ticket.