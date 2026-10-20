# CelebrAI graphical frontend migration

## Preserve and adapt

The existing `app.py`, `celebrai/` services, models, prompts and original dependency files remain unchanged. Their baseline hashes are recorded in `streamlit-baseline-hashes.json`. React lives in `frontend/`; a thin local FastAPI adapter lives in `webapi/`. The subsequent GenAI integration reuses the original provider through optional, explicitly approved server-side calls. No paid call was made during implementation or verification.

Reusable services: `planning.create_plan/demo/critique`, `budget.rescue/distribute/minor`, `copilot.respond`, `timeline.timeline`, `storage.Store`, `exports.pdf_export/csv_export`, and all Pydantic models.

FastAPI is necessary to expose these Python services to the browser. Calculations, validation, revisions and exports stay in Python. React receives a typed JSON plan and renders it. Vite proxies `/api` locally, avoiding permissive CORS. The API listens on loopback. The web demo uses `data/celebrai-web.db` by default so it cannot alter the original Streamlit database; set `CELEBRAI_WEB_DB` explicitly to share a database if desired.

## Delivery sequence

1. Complete and test the vertical slice: select a seeded or saved event, render metrics, edit allocated/planned/actual amounts, save to SQLite and verify a reload. Invalid totals and stale revisions must be rejected.
2. Add planning studio with structured event creation and offline conversation, inspiration board with persistent saved ideas, task/calendar views, editable vendor cards, rescue previews and confirmations, what-if comparisons, readiness checks and original exports.
3. Build TypeScript, execute API integration and existing regression tests, then exercise actual browser flows at desktop and narrow widths.

## Product direction

Warm ivory canvas, aubergine navigation, restrained violet accents, editorial serif headlines, soft lavender panels and photography. A command center tells a useful story: event identity, actual progress, budget health, next milestone and a next action. All visual numbers derive from the selected plan. Unbooked vendors and incomplete tasks remain visibly unconfirmed. A readiness score displays its formula and does not claim event safety. All controls navigate, filter, edit, preview, save, export or open a meaningful dialog.

Images are bundled locally so the demonstration does not depend on an image CDN at runtime. Offline means no paid model call or external service is required once dependencies are installed. The original optional OpenAI flow remains available in the Streamlit fallback and is now also exposed through React; see `AI_INTEGRATION.md`.
