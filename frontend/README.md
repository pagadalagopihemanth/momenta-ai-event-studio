# CelebrAI Studio

A separate React + TypeScript frontend for the original CelebrAI Python application. Uses Vite, Tailwind CSS v4, accessible Radix Dialog primitives, Lucide icons and Recharts. Reusable Button, Badge and Modal components follow a shadcn-style composition approach; this project does not depend on a generated shadcn application template.

## Run the finished app (one server)

From the repository root, install the additional Python adapter dependencies:

```powershell
.\.venv\Scripts\python -m pip install -r requirements-web.txt
```

Build the frontend using Node.js 22+ (tested with 24.18):

```powershell
cd frontend
npm ci
npm run build
cd ..
.\.venv\Scripts\python -m uvicorn webapi.app:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000**. FastAPI serves the compiled frontend and `/api` from the same origin. Restart the API after the first build so it discovers `frontend/dist`. The demo requires no internet, CDN, API key or external AI service after installation.

## Frontend development (two terminals)

Terminal 1, from the root:

```powershell
.\.venv\Scripts\python -m uvicorn webapi.app:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to the Python server; no permissive CORS configuration is used. The API accepts local origins on ports 8000 and 5173 only. It is intended for a trusted local user, not public hosting.

## Existing Streamlit fallback

The original `app.py`, `celebrai/` modules, original requirements files and prompts are preserved:

```powershell
.\.venv\Scripts\python -m streamlit run app.py
```

The React demo defaults to `data/celebrai-web.db`. The Streamlit fallback retains `data/celebrai.db`. This deliberate separation protects existing event data. To share storage, explicitly set `$env:CELEBRAI_WEB_DB` to your Streamlit database path **before starting the API**. Both interfaces reuse the same `Store` implementation and revision checks. Demo seeding only inserts missing `web-demo-*` records; it does not reset saved plans.

## Working experiences

- **Command center:** event selection, original three illustrative scenarios, event creation, budget/guest/task/countdown metrics, next milestones and recommendations.
- **AI Planning Studio:** Offline Demo and optional genuine Live AI conversation and event-plan generation, suggested prompts, preview confirmation, editable results and event briefs. The original Python `LiveProvider` is reused through FastAPI; no browser API key is used.
- **Inspiration board:** bundled photos, palettes, concept details, category and saved filters, persistent concept saving, offline idea generation and optional AI-personalized ideas. Reference imagery is not a representation of booked services.
- **Budget Studio:** editable allocations/planned/actual spending, live draft chart, server validation, explicit saving, CSV export, protected Budget Rescue and before/after review. Live mode adds model-powered trade-offs and savings recommendations to Python-calculated rescue allocations. A checkbox and confirmation button are required to apply proposals.
- **Timeline:** chronological task cards, dependencies, task completion, editable dates/notes/priorities, filters, calendar and CSV export.
- **Vendor workspace:** category cards, priority/status filters, notes and user-supplied contacts, new requirements and persistence. No vendor is contacted.
- **What-if:** Python-calculated guest, budget, indoor/outdoor and theme comparisons, accessible chart table, headroom, affected tasks and explicit assumptions. No plan mutation.
- **Readiness:** transparent four-part score, original critic warnings, optional independent AI Plan Critic, actionable navigation, complete PDF and CSV exports. Model reviews are labeled subjective and never alter the numeric score.
- **Two-minute guided demo:** the top-bar walkthrough creates a fresh illustrative wedding and guides generation, budget review, rescue, confirmation, readiness and PDF export.

## Live AI setup and explicit approval

Keep these settings in the Python server environment; no credential is entered or stored in the React UI:

```powershell
$env:CELEBRAI_LIVE_ENABLED = 'true'
$env:OPENAI_API_KEY = '<your server-side secret>'
$env:OPENAI_MODEL = '<structured-output model available in your API account>'
$env:CELEBRAI_WEB_AI_DAILY_LIMIT = '5'
.\.venv\Scripts\python -m uvicorn webapi.app:app --host 127.0.0.1 --port 8000
```

Open AI setup to inspect readiness, then select Live AI. The app asks for approval **for each potentially paid request**, including event-context transmission and at most one SDK retry. Mode selection alone never calls a model. The existing provider caps output at 2,200 tokens and uses a 25-second timeout per attempt. React waits up to 90 seconds and never retries automatically. Account billing is separate from ChatGPT subscriptions.

A SQLite request ledger limits approved attempts to five per server date by default and survives restarts. `CELEBRAI_WEB_AI_DAILY_LIMIT` accepts 1–100. Failed attempts consume the limit. Request IDs prevent duplicate model calls for the same approved payload; each original workflow provider also retains its three-call process limit. Usage limits are not a guaranteed monetary cap. Vendor contact fields are redacted before transmission. Provider exceptions return safe errors without raw credentials or SDK request metadata. No live paid request was used to verify this integration; SDK responses were mocked.

See [AI architecture](../docs/AI_INTEGRATION.md) for the five workflows, validation and remaining limits.

## Verified downloads

All exports use controlled fetch-to-Blob downloads with loading and error states. The UI validates MIME type, filename, nonempty content and PDF signature before triggering the browser download. Files use `Content-Disposition: attachment`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.

Verified filenames: `celebrai-plan.pdf`, `celebrai-budget.csv`, `celebrai-timeline.csv`, `celebrai-vendors.csv`. Actual desktop downloads were captured and read back; a mobile-width PDF download was also verified. Error handling is tested with mocked failed and invalid responses.

## Validation and boundaries

All saved plan state is validated by existing Pydantic models and SQLite optimistic revision checks. Budget sums, actual-spend floors and rescue allocations are authoritative in Python. UI draft arithmetic is provisional. Server-issued proposal tokens are tied to event ID and revision, expire after 15 minutes and cannot be replayed after successful application. Restarting the API invalidates unsaved previews.

Radix dialogs support focus trapping, Escape and keyboard interaction. The app has labeled fields, visible focus styles, skip navigation, reduced-motion handling, semantic tables and text alternatives to charts. CSS adapts navigation, cards and forms for smaller screens. This does not claim a formal screen-reader or WCAG certification.

## Checks

```powershell
# From the repository root:
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python -m pip check

# From frontend/:
npm test
npm run build
npm audit
```

Frontend tests cover API serialization, error handling, currency/date presentation, per-call approval gating and browser download creation. API integration tests additionally cover all five mocked AI workflows, durable limits, duplicate protection, contact redaction, malformed output and download contracts. Existing Streamlit tests remain part of the full suite.

## Product limits

This remains a local single-planner application without authentication or per-user isolation. The readiness score measures recorded progress, not safety. Simulation uses stated heuristics rather than real market quotes. Dates use the API host's date. Offline copilot supports the original fixed intent set; it is not a local language model. Chat history is temporary and resets when the Studio is unmounted or reloaded. Saved suggestions and accepted changes persist. Unsaved editor drafts are not saved automatically. Images and palettes are curated references, not generated visual designs. PDF language/font limitations of the original export service still apply.

See `../docs/MIGRATION.md`, `../docs/WEB_VERIFICATION.md` and `../docs/ASSETS.md`.
