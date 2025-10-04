# Webcomic Tracker — Implementation Proposal

This document proposes a small browser extension that helps you track webcomic series and the chapter you left off. It stores all data locally (no user accounts) and provides a simple export/import mechanism so you can move your data between machines.

## Goals and constraints
- Minimal UI: let the user add a series name and the last-read chapter, edit/delete entries, and quickly see progress.
- Local-only storage: no account, no remote servers. Data is stored in the browser's local extension storage and can be exported to/imported from a JSON file.
- Cross-browser: target Chromium-based browsers (Chrome, Edge) and Firefox using the WebExtensions API (manifest v3 where supported).
- Small, maintainable codebase: prefer plain TypeScript (or JavaScript + JSDoc) with a simple UI (vanilla HTML/CSS or a tiny framework only if you prefer it).

## Tiny contract (inputs / outputs / success)
- Inputs: user-provided series name (string) and chapter/position (string or number). Optional notes or URL.
- Outputs: readable list of tracked series with last-read chapter; exported JSON file representing all entries.
- Success criteria: users can add/edit/delete series, data persists across browser sessions, and data can be exported/imported reliably.

## Data model
Simple JSON-backed model stored in extension local storage. Example TypeScript interface:

```ts
interface ComicEntry {
  id: string; // UUID or timestamp-based id
  title: string; // series name
  chapter: string; // flexible to allow "Ch. 12", "S1E4", or a URL fragment
  url?: string; // optional current-chapter URL
  notes?: string; // optional free text
  updatedAt: number; // epoch ms
}

interface Store {
  entries: ComicEntry[];
}
```

Export/import format: a single JSON object matching `Store`. Example:

```json
{
  "entries": [
    {"id":"1","title":"Example","chapter":"12","updatedAt":1690000000000}
  ]
}
```

## UI / UX (popup-first)
- Primary surface: extension popup (small window opened from toolbar).
  - Top: quick add form (title + chapter + optional URL).
  - Middle: list of tracked series sorted by updatedAt desc; each row shows title, chapter, edit and delete controls, and an optional open-in-tab button if `url` present.
  - Bottom: actions: Export, Import, Clear all, Settings (if needed).
- Optional: context menu or keyboard shortcut to quickly add current page as a series/chapter.

Wireframe (text):
- [Add] Title: [________] Chapter: [_____] [+Add]
- List:
  - Title  — Chapter  [Edit] [Delete] [Open]
- Controls: [Export .json] [Import .json] [Clear all]

## Key implementation points
- Storage API: use `chrome.storage.local` (or `browser.storage.local` in Firefox). This keeps data private to the extension and synced only if the browser has its own sync feature (but do not rely on it).
- Export: create a JSON blob from the store and trigger a download (filename like `webcomic-tracker-YYYYMMDD.json`).
- Import: accept a JSON file, validate shape (basic validation), and offer to merge or replace. Merge policy default: deduplicate by `id` (or by normalized title when id absent) and use newer `updatedAt`.
- IDs: generate stable unique ids when creating entries (UUID v4 or timestamp + random suffix).
- Validation: title required, chapter optional but recommended.
- Accessibility: keyboard navigable popup, sensible contrast and labels.

## File list (minimal)
- `manifest.json` — WebExtension manifest (v3 recommended)
- `src/popup.html` — Popup markup
- `src/popup.css` — Styles
- `src/popup.ts` — Popup logic (TS compiled to JS)
- `src/background.ts` — (optional) background script, used for context menu or long-running tasks
- `src/options.html` (optional) — larger UI for bulk import/export/settings
- `src/utils/storage.ts` — storage helper and migration helpers
- `src/utils/export.ts` — export/import helpers and validation
- `README.md` — user instructions

## Example manifest (high-level)
- manifest v3 with `action` popup pointing at `popup.html`, permissions: `storage`, `downloads` (for export), `contextMenus` (optional), `activeTab` (if open current page) and host permissions only if you intend to inject scripts (not required for this project).

## Edge cases and decisions
- Data migration: if schema evolves, include a simple migration step on load to convert older entries to the new shape.
- Conflicts during import: ask user whether to merge or overwrite. Default to merge with newest-wins per `updatedAt`.
- Large imports: handle gracefully and show progress if importing thousands of entries (unlikely for this use case).
- Storage limits: `chrome.storage.local` has a quota (per-item and total). For reasonable-sized webcomic lists this is fine; if users store very long notes, warn them and suggest the import/export file.

## Security & Privacy
- All data remains on the user's machine. Do not transmit data off-device.
- When implementing import, validate and sanitize input to avoid loading unexpected data into the extension's UI.

## Testing plan
- Unit tests for storage helpers and import/export validation (using a small test runner or Node + jest).
- Manual smoke tests in Chrome and Firefox: add/edit/delete, export, import, merge behavior.
- Accessibility checks: keyboard navigation and screen-reader basics.

## Build & packaging
- Use a small toolchain: TypeScript compiler (tsc) or esbuild for faster bundling. Keep the build simple so you can produce a zip for browser upload.
- Provide build scripts and a release step that produces a `dist/` folder containing the final `manifest.json` and compiled assets.

## Timeline & milestones (approx.)
- Day 0 (design, this proposal) — confirm scope.
- Day 1 — scaffold extension, popup UI, basic add/list/delete, local storage wired.
- Day 2 — export/import, validation, merge/replace flows, and edge-case handling.
- Day 3 — polish UI, accessibility, testing on Chrome+Firefox, create build scripts and README.
- Day 4 — small QA pass and packaging for distribution.

## Next steps (pick one)
1. I can scaffold the extension files and add a working popup prototype (local storage + add/list/delete + export/import merge). This will include `manifest.json`, `popup.html`, `popup.ts` and a minimal build script.
2. Or, if you prefer, I can produce a minimal runnable zip (source + compiled JS) ready to load as an unpacked extension.

Tell me which option you prefer and whether you want TypeScript or plain JavaScript. If you want, I can start by creating the scaffold and a small demo popup in the repo.

---
Last updated: 2025-10-04
