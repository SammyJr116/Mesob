# AGENTS.md

## Project Context

This is a standalone React + Vite restaurant management frontend. There is no backend service and no external platform: data is sample data in `src/lib/mockData.js`, and persistence is `localStorage`. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for setup and build details.

## Key Files

- `src/pages/`: one file per screen; routes live in `src/App.jsx`.
- `src/components/`: shared components. `src/components/ui/` is the shadcn-style primitive set — extend it rather than forking variants.
- `src/components/ui/shared.jsx`: the in-house page-level components (`PageHeader`, `StatCard`, `SectionCard`, `StatusBadge`) used by most pages.
- `src/lib/mockData.js`: all sample entities plus shared helpers (`calcBill`, `etb`, `ROLES`, `restaurant`).
- `src/lib/RoleContext.jsx`: the active role, persisted to `localStorage["rms_role"]`. This is what gates the UI — `src/App.jsx` shows `RoleSelect` when no role is set.
- `src/lib/localAuth.js`: `localStorage`-backed stand-in for an auth service. Plaintext passwords, demo only.
- `src/lib/utils.js`: `cn()` class merger, `isIframe`.
- `vite.config.js`: Vite config with the `@` → `./src` alias. No plugins beyond React.
- `public/images/`: hero and role-select artwork, served as-is from the site root.

## Working Notes

- `npm run dev` is the only local run command. Do not add scripts that assume a backend, proxy, or platform CLI.
- Adding persistence means writing to `localStorage` and reading it back, following the pattern in `RoleContext.jsx` / `localAuth.js`. Do not reintroduce a network client or SDK.
- Images referenced by URL must be vendored under `public/`. The app is expected to work offline apart from Google Fonts.
- `@/` resolves to `./src` via the Vite alias and `jsconfig.json` paths; both must stay in sync if you change it.
- Run `npm run lint` and `npm run typecheck` before finishing code changes. `jsconfig.json` typechecks `src/pages`, `src/components`, `src/hooks`, and `src/lib`; `src/components/ui` is excluded because the primitives are untyped prop bags.