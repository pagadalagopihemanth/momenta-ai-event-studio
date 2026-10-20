# React migration verification

The first vertical slice was verified before the remaining experiences were implemented.

## Automated checks

- Full Python suite: **56 passed**, including the original tests, migration API tests, and 12 new mocked AI/export-contract cases.
- Frontend Vitest suite: **13 passed**, covering JSON boundaries, validation/conflict errors, currency/date presentation, strict per-request approval and download validation/error handling.
- TypeScript compilation and Vite production build passed. Charts and dialog primitives are split into separate bundles.
- `npm audit`: **0 vulnerabilities** after updating the test runner to a patched version.
- `pip check`: **No broken requirements found**. FastAPI's TestClient emits a deprecation notice about its httpx adapter; it does not affect the passing tests.
- File hashes for `app.py` and every original `celebrai/*.py` service match the pre-migration baseline. The original Python dependency and prompt files were not edited.

## Browser checks

- Event selector switches between distinct demo plans.
- Saving a INR 12,500 venue actual expense survives a browser reload.
- A decoration reduction from the copilot opens a before/after preview. Apply is disabled until the explicit confirmation checkbox is selected. Confirming saves the allocation and adds a task.
- The dedicated Budget Rescue form previews a INR 900,000 → INR 700,000 wedding reallocation with Catering and Photography unchanged. Discarding the proposal leaves the INR 900,000 plan intact.
- Saving an inspiration concept updates the saved count and persists it in the event's ideas.
- A dependent task starts disabled. Completing the prerequisite updates progress and unlocks it. The calendar renders tasks in their month.
- Editing a vendor status and note updates the card and summary.
- A 350-guest outdoor modern scenario returns category costs, headroom and affected tasks from Python.
- The readiness view renders its four-part formula and actionable warnings.
- The compiled frontend is served directly by FastAPI on port 8000, without Vite. A new birthday was created through its two-step browser form and generated a persisted Python plan.
- At a 390×844 viewport, command center cards stack, navigation becomes a drawer, and budget tables scroll within their container. Measured document content width equals its viewport width; no page-level horizontal overflow was observed.
- Mobile navigation excludes hidden links from the accessibility tree. Opening it makes the main workspace inert; Escape closes it. Radix dialogs provide focus handling for edits and confirmations.
- Final desktop and mobile screenshots are saved in `docs/studio-desktop.png` and `docs/studio-mobile.png`.

No live AI requests, deployment or GitHub push was performed. React now exposes all five optional Live AI workflows through the original server-side provider, alongside Offline Demo. Tests replace the OpenAI SDK with mock responses; real credentials, model availability, billing, latency and model quality remain unverified.

The earlier direct-link PDF download automation issue is resolved. Controlled fetch-to-Blob downloads now validate headers, filenames, nonempty content and PDF signature and show loading/errors without navigating away.

## Latest end-to-end walkthrough and real downloads

On 21 October 2026, the actual browser completed the seven-step guided wedding flow: creation → personalized offline generation → confirmed proposal → budget review → protected INR 700,000 rescue → confirmed saving → readiness → PDF export. Live AI was explicitly disabled on the browser-test server to prevent paid calls. Configuration status and the unavailable Live AI choice were inspected; no browser secret field is provided.

The browser returned these real download paths:

- `C:/Users/Hemanth/Downloads/celebrai-plan.pdf`
- `C:/Users/Hemanth/Downloads/celebrai-budget.csv`
- `C:/Users/Hemanth/Downloads/celebrai-timeline.csv`
- `C:/Users/Hemanth/Downloads/celebrai-vendors.csv`

The downloaded PDF was parsed with PyMuPDF: three pages, guided wedding name and revised INR 700,000 budget present. Downloaded CSVs parse as UTF-8 with 9 budget rows, 16 timeline tasks and 8 vendor requirements. Decimal summation of downloaded budget allocations equals exactly INR 700,000.

At 390×844, the AI mode/setup controls fit, mobile navigation and readiness work, and content width equals viewport width (375 CSS px after the scrollbar). A second real PDF download returned `celebrai-plan (1).pdf`. No page-level horizontal overflow was observed. Download failure/type/signature/filename handling is tested with mocked frontend responses.

No formal screen-reader audit, physical-device test, multi-user load test or WCAG certification was performed. See `AI_INTEGRATION.md` for the remaining live-API verification limits and `TWO_MINUTE_DEMO.md` for presentation instructions.
