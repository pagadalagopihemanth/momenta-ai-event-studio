# CelebrAI

**Plan smarter. Celebrate better.** A local-first celebration planning studio for the PromptWars Virtual Challenge by Hack2skill, topic: Celebration & Event Planner. No unverified judging rules or submission requirements are assumed.

The enhanced **React CelebrAI Studio** runs alongside this original Streamlit app. Start with [START_STUDIO.md](START_STUDIO.md), the [two-minute walkthrough](docs/TWO_MINUTE_DEMO.md) and [Live AI integration guide](docs/AI_INTEGRATION.md). All five AI workflows are now available through the React UI with per-request approval; the original Streamlit code remains unchanged.

## Start locally

Python 3.11+ (developed on Windows with Python 3.13).

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m streamlit run app.py
```

Open the URL printed by Streamlit (usually http://localhost:8501). No API key is needed. A wedding preview loads on first launch; save it or load one of three illustrative scenarios from Guided demo. Dates are calculated 120 days from the current local date. All estimates are illustrative allowances, not market price research or quotes.

For the exact tested dependency versions, install `requirements.lock.txt` instead. The lock was generated on Windows/Python 3.13; use the version ranges on other platforms if a pinned wheel is unavailable. PDF visual QA used PyMuPDF as an additional development tool; it is not needed to run the app.

## What you can do

- Create weddings, birthdays and community events through a three-step wizard.
- Save and reopen plans in SQLite; edit details, budget rows, tasks and vendor requirements.
- View category charts, actual spending, remaining funds, per-guest cost and overspending alerts.
- Preview Budget Rescue with protected categories, actual-spending floors, vendor estimate updates and new quotation tasks. Explicit confirmation is required to apply a proposal.
- Use an offline intent-based copilot for decoration reductions, budget cuts, pending tasks, extra-guest estimates, Telugu menus, child-friendly activities and weather backups.
- Compare guest counts, budget, venue setting and theme. Variable spending scales per guest; outdoor scenarios include a weather allowance. Theme effects need quotes.
- Run rule-based readiness checks and export a complete PDF plus budget, vendor and timeline CSV files.

## Optional OpenAI integration

The default is **offline**. Offline output uses transparent templates and deterministic intent parsing; it is not a local language model. Live AI has not been tested against a paid endpoint.

Environment variables are read from the process; `.env.example` is a reference, **not automatically loaded**. For PowerShell:

```powershell
$env:OPENAI_API_KEY = '<your-key>'
$env:OPENAI_MODEL = '<a-model-in-your-account-supporting-structured-outputs>'
$env:CELEBRAI_LIVE_ENABLED = 'true'
.\.venv\Scripts\python -m streamlit run app.py
```

Choose a workflow in Rescue & Copilot and explicitly approve each potentially paid request. ChatGPT subscriptions do not imply API credits. Never commit `.env` or keys. Configure account spending limits too: the app's session limit of three calls can reset with a new session. Requests have a 25-second timeout, at most one retry and 2,200 output tokens. These are usage bounds, not a guaranteed monetary cap. Event data is sent to OpenAI only after approval; avoid sensitive guest/contact data. Requests set `store=False`.

The provider uses the [official OpenAI Structured Outputs pattern](https://developers.openai.com/api/docs/guides/structured-outputs), `responses.parse` with Pydantic. Live workflows return suggestions rather than modifying monetary or timeline state. Budget edits always pass through Python and preview confirmation. Refusals, incomplete responses and errors leave the saved plan unchanged.

## Architecture

`app.py` composes Streamlit UI; `celebrai/ui.py` contains shared styling. `models.py` validates event/plan contracts. `planning.py`, `budget.py`, `timeline.py` and `copilot.py` implement offline services. Vendor models and requirements live in `models.py` and `planning.py`. `storage.py` uses parameterized SQL and revision checks within transactions. `ai.py` isolates optional network access; `prompts/` contains five versioned prompt contracts. `exports.py` builds PDF and CSV output. `tests/` covers finances, planning, persistence, exports, workflows and Streamlit interactions.

Money is stored as integer minor units. Decimal conversion rounds half-up; largest-remainder allocation preserves exact totals. Planned and actual costs are independent. Rescue never refunds recorded spending, preserves protected allocations, rejects infeasible targets and does not save until confirmed. Revision conflicts prevent stale saves.

Prompt architecture separates generative language from authoritative computations. Each workflow has one responsibility, an explicit schema, untrusted-input instructions and a sample JSON response. The critic has an independent reviewer role. Model output is never executed as code or SQL and cannot call tools. These controls reduce prompt-injection impact; they cannot guarantee perfect language-model behavior.

## Verify

```powershell
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python -m pip check
```

## Deployment

Run the same Streamlit command on a Python host with persistent writable disk; set `CELEBRAI_DB` to a durable path. Bind to the host's port with `--server.address 0.0.0.0 --server.port 8501`. For Streamlit Community Cloud use `app.py` and `requirements.txt`; its local disk may be ephemeral, so do not rely on it for permanent storage. Keep secrets in the host's secret manager/environment. No deployment is performed by this project.

This MVP is intended for one trusted planner locally. Before a public multi-user launch, add authentication, per-user authorization, durable database backups, rate limiting, access controls and retention policies. SQLite is shared across sessions; there is no user isolation.

## Known limitations

Offline copilot recognizes a bounded set of intents and may ask users to use structured controls. Budget numbers in free text are interpreted in the event currency. Capacity, safety, prices, vendors and cultural suitability require human verification. The simulator is a transparent approximation. Changing the event date resets task completion. PDF standard fonts support Latin text and use `INR` for rupees; non-Latin names may need a Unicode font enhancement. Local dates follow the deployment host timezone. There is no booking, messaging, guest-level database, payment processing or automated vendor lookup.

See [demo script](docs/DEMO.md), [submission draft](docs/SUBMISSION.md) and [verification record](docs/VERIFICATION.md).
