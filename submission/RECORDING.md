# Reproducible recording

Scripts automate actual application interactions, never injected fake plans or mocked responses presented as live AI. Port 8000 and existing user data remain untouched.

## Setup (Windows)

```powershell
.\.venv\Scripts\python -m pip install -r requirements-recording.txt
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $env:TEMP 'MomentaPlaywright'
.\.venv\Scripts\python -m playwright install chromium --only-shell
cd frontend
npm ci
npm run build
cd ..
```

Keep port **5173** free: it is already allowed by the application's local-origin security rules. Each recording launches FastAPI there with a unique SQLite database under ignored `submission/private/`, a fresh browser context and an owned server that is stopped afterward.

## Safe rehearsal

```powershell
.\.venv\Scripts\python scripts/record_submission.py --quick
.\.venv\Scripts\python scripts/record_submission.py
.\.venv\Scripts\python scripts/produce_video.py
```

Quick mode verifies selectors/results but cannot be promoted as the finished video. Full recording includes readable holds, cursor movement, form entry, confirmation, expected HTTP 422 rejection and PDF download. FFmpeg produces actual footage at 1920×1080/30 FPS with captions, targeting 210 seconds. It may gently slow footage to improve readability, but never accelerates important interactions and rejects excessive capture length. Offline output is **`Momenta_PromptWars_Rehearsal.mp4`**, with a persistent rehearsal banner.

## Genuine live version — explicit approval required

First privately configure a server-only key/model and approve **two potentially paid requests**, planning and Budget Rescue, each with at most one SDK retry. Do not put secrets in arguments, code, recordings or browser variables. Only after approval:

```powershell
.\.venv\Scripts\python scripts/record_submission.py --live --approve-paid
.\.venv\Scripts\python scripts/produce_video.py
```

Per-call UI approval dialogs remain in the recording. Missing configuration, refusal, failed response or missing confirmation aborts the run. Failure evidence remains private and is never promoted. Two successful live endpoint responses are required before writing **`Momenta_PromptWars_Final.mp4`**. The impossible-budget step is rejected before a model call. The isolated request limit is two; it is not a guaranteed monetary cap.

Review `video-verification.json`, `video-contact-sheet.jpg`, representative frames and the full MP4. Confirm readable genuine model results before approving the live version. Do not upload rehearsal as the final GenAI demonstration. Neither script uploads, changes sharing, pushes or submits anything.

The authorized final run must follow LIVE_SETUP.md: billing confirmation and metadata access check first, scoped persistent spending reservations, no duplicate generation for verification and filming. Earlier generic request-limit notes do not replace these final-run controls.
