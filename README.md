# Mesob — Restaurant Management

A standalone restaurant management console: orders, tables, the floor, menu and recipes, the kitchen queue, inventory and purchasing, staff, cleaning, maintenance, and reports.

React + Vite, frontend only. There is no backend service — data is sample data in `src/lib/mockData.js`, and the things that must persist (chosen role, credentials, session) live in `localStorage`.

## Requirements

- Node.js 20 or newer

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173`). On first load the app asks you to pick a role — each role lands on its own workspace with its own navigation, and you can switch roles from the sidebar. No account needed.

## Build

```bash
npm run build     # production bundle into dist/
npm run preview   # serve the built bundle locally
```

`dist/` is a static folder. Any static host works; for client-side routing, rewrite unknown paths to `index.html`.

## Checks

```bash
npm run lint       # eslint
npm run typecheck  # tsc against jsconfig.json
```

## Project Layout

- `src/pages/` — one file per screen, routed in `src/App.jsx`
- `src/components/` — shared components; `src/components/ui/` is the shadcn-style primitive set
- `src/lib/` — sample data (`mockData.js`), role state (`RoleContext.jsx`), local auth (`localAuth.js`), helpers
- `public/` — static assets, including the hero and role-select artwork in `public/images/`

## Notes on Auth

`src/lib/localAuth.js` is a small `localStorage` stand-in for a real auth service: sign-up, sign-in, Google-style one-click sign-in, and password reset all resolve against a local user list seeded with a demo account. Passwords are stored as plain strings because this is a UI demo with no backend — do not reuse this file as a model for real credential handling.

## Deployment Notes

`public/manifest.json` and `public/favicon.svg` are referenced from `index.html`. Fonts come from Google Fonts, so the type system needs network access; the app falls back to system fonts otherwise.