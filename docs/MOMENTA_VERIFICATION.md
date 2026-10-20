# Momenta verification — 21 October 2026

## Recovery and compatibility

- Local pre-change Git checkpoint: `538a0fc`.
- Existing workspace and database filenames are retained. No schema migration, reset, deployment, push or paid model request was performed.
- Baseline comparison: original `app.py` and ten other baseline files checked; only `celebrai/exports.py` differs. That renderer gained optional keyword branding with unchanged CelebrAI defaults. Integration tests verify both legacy and Momenta PDF identities.
- Planning, budget validation, timeline logic, SQLite persistence, AI provider and all five AI workflows retain their existing implementations. Their existing tests remain in the suite.

## Automated checks

- `python -m pytest -q`: **57 passed**. Includes original Streamlit AppTest, existing mocked AI integration coverage, budget/persistence contracts and new opt-in export tests.
- `npm test`: **17 passed** across six test files. Added landing CTA routing, occasion defaults through actual wizard submission, budget differences, priority indicators and immutable visualization checks. Existing AI approval and download tests remain intact.
- `npm run build`: TypeScript and Vite production compilation passed.
- `npm audit --omit=dev`: no reported vulnerabilities.
- `python -m pip check`: no broken requirements.
- Python test suite emits the existing Starlette/httpx TestClient deprecation warning; no runtime failure accompanied it.

## Actual browser checks

Tested the compiled frontend served by FastAPI on `127.0.0.1:8000`, with Live AI explicitly disabled.

- Landing, visual occasion selection, saved workspace entry, and mobile birthday wizard selection. Birthday defaults verified as 40 guests, INR 50,000 and four hours.
- Created an illustrative wedding through the real wizard; generated its offline plan, reviewed it and confirmed persistence.
- Completed all seven guided steps: creation, personalized generation, budget review, rescue preview, confirmation, readiness review and PDF export.
- Rescue reduced INR 900,000 to INR 700,000 while retaining Catering at INR 270,000 and Photography at INR 108,000. Before/after bars, per-category deltas and added renegotiation tasks rendered in the review dialog. Saving required the explicit review checkbox.
- Checked Command Center, AI Studio, inspiration, budgets, timeline/calendar, vendors, simulation and readiness. Ran a 350-guest outdoor simulation and a context-aware pending-tasks copilot request in Offline Demo.
- Mobile navigation and all eight workspace screens were checked. At a 390 CSS-pixel window (380px content viewport after scrollbar), document width equaled viewport width on each checked screen. A narrow zoomed-layout overflow was identified and fixed in the Studio grid and header.
- Edited Venue actual spending to INR 500 on a newly created illustrative review event and saved it.
- Actual browser downloads completed: `momenta-plan.pdf` and `momenta-budget.csv`. Parsed the downloaded PDF: three pages, Momenta author metadata and branded heading. Parsed the downloaded CSV: nine categories, Venue actual `500.00`, allocation sum `70000000` minor units. Tests separately verify all four export types, headers, contents and the original filenames without the brand query.

## Limits

No paid live AI request was made; live provider behavior remains verified with mocked responses. Browser checks used the desktop app's browser and responsive viewport controls, not physical mobile devices or multiple browser engines. Reduced-motion support is implemented for Motion, charts, CSS transitions and the thinking identity; no formal accessibility certification or independently timed human two-minute study is claimed. Photographs remain illustrative references, and vendors/quotes require user verification.

Screenshots: `momenta-mobile-landing.png`, `momenta-mobile-studio.png`, `momenta-rescue.png`, plus final desktop captures. See `MOMENTA.md` for design/compatibility notes and `ASSETS.md` for asset provenance.
