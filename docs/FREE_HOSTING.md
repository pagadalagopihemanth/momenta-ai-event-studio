# Free hosting assessment — 21 October 2026

## Recommendation

Use **one Render Free Docker web service** for the challenge, with the existing isolated offline public entry point, no disk, no database service and no OpenAI key. This is a viable disposable demonstration if a judge can tolerate a cold start of about one minute after 15 idle minutes. It is not an always-on availability guarantee. Hosting and model API cost can remain $0 by using a no-payment-method/free account and staying within included usage; stop rather than add billing or upgrade if account setup requires payment.

`render.free.yaml` is prepared for publication and passes Render's published Blueprint JSON schema. It explicitly selects plan `free`, omits disk provisioning, disables automatic deploys and live AI, and uses writable ephemeral `/tmp/momenta-disposable-demo`. Do not provision the paid default `render.yaml` when choosing this option. Deployment requires the approved free-only account checks; no service has been created.

## Comparison

| Platform | Existing React + FastAPI fit | Free-plan constraints | Conclusion |
|---|---|---|---|
| Render Free | Same Docker image; one HTTPS origin; existing Render hostname auto-configuration | Sleeps after 15 idle minutes; about one-minute wake-up; 750 shared instance-hours/month; SQLite lost on sleep/restart/redeploy; no disks. Usage limits may suspend service | Simplest viable $0 challenge demo |
| Koyeb Free | Docker/FastAPI fits; set MOMENTA_PUBLIC_ORIGIN to the actual assigned HTTPS URL | 512 MB / 0.1 CPU, no persistent volumes; sleeps after one idle hour. Official onboarding FAQ requires a card/$29 temporary authorization and warns signup can charge a selected Pro plan | Technically viable, but not the safest zero-spend onboarding choice; no signup/hold authorized |
| Railway Free | Docker/FastAPI fits; set canonical origin; disposable storage works | $0 subscription includes only $1 of monthly usage credit after a one-time $5/30-day trial. Continuous availability within that small credit cannot be assumed | Possible short trial/demo, less predictable duration than Render Free |
| Hugging Face Spaces | Docker could serve both parts | Current overview says new Docker/Gradio compute Spaces require a paid PRO/Team plan; static Spaces alone cannot run FastAPI. ZeroGPU Gradio exception does not preserve this architecture | Does not meet the no-paid-subscription requirement for a new Docker Space |
| PythonAnywhere | React could be built elsewhere and served through FastAPI | ASGI hosting remains experimental; official ASGI docs do not settle long-term/free availability and static mappings are unsupported | Not the simplest reliable challenge path |

Do not assume static-only services such as GitHub Pages can execute Python, SQLite or ReportLab. Splitting the frontend from another API host adds configuration without removing backend availability limits. No application redesign is needed.

## Safety and feature behavior

- Use the existing public wrapper, not the original single-user entry point. Signed, Secure, HttpOnly cookies select isolated SQLite workspaces. Foreign plan IDs, exports and proposal tokens cannot cross workspaces. Original owner data is never uploaded or mounted.
- Live AI routes remain denied even if an operator mistakenly sets an OpenAI key. Do not configure a key. No public API billing path is exposed.
- Offline event creation/planning, protected-category Budget Rescue, timeline/vendor tasks and PDF/CSV exports reuse the tested Python services. The verified final video remains unchanged.
- Data is explicitly disposable. Before the free deployment, update the existing notice to clarify that restart/sleep may reset a workspace before the 24-hour maximum. Download/export to retain a plan. No persistence or account system is promised.
- No external uptime pinger or always-on workaround is proposed. A judge may need to wait through a cold start. If instantaneous availability is mandatory, this free option is insufficient.
- On an account without a payment method, Render documents suspension rather than billing on free usage exhaustion. If a payment method already exists, free compute can still incur bandwidth/build overages; do not claim zero-cost protection until the account's billing situation is checked. Do not remove/change billing settings or create another account without permission.

## Current evidence and remaining checks

The reviewed deployment/security commit d0b34fc was secret-scanned (185 reachable blobs) and pushed normally to public main with owner approval. Its 71 Python / 17 frontend tests, production frontend build and two-context desktop/mobile local HTTPS smoke passed previously. No tests or paid AI calls were repeated for this research. Linux dependency wheels resolved and the free Blueprint schema passes. The local Docker engine remains unavailable, so the actual container build and hosted cold-start/memory behavior still require verification after explicit deployment approval.

No service, disk, trial, subscription, deployment or PromptWars submission has been created. `render.free.yaml` and this research accompany the approved free-only deployment preparation.

## Paid fallback only if approved

Render `0.5c-512mb`: **$7/month** + 1 GB persistent disk **$0.25/month** = **$7.25/month baseline**, plus tax and any bandwidth/build overages. Hobby workspace base $0. Paid compute avoids idle sleep and a disk retains isolated SQLite workspaces across restarts (subject to their expiry). Confirm checkout pricing; no upgrade, disk or spending is authorized now.

## Sources

- https://render.com/docs/free
- https://render.com/docs/faq
- https://render.com/pricing
- https://www.koyeb.com/docs/reference/instances
- https://www.koyeb.com/docs/run-and-scale/scale-to-zero
- https://www.koyeb.com/docs/faqs/pricing
- https://docs.railway.com/pricing/plans
- https://docs.railway.com/pricing/free-trial
- https://huggingface.co/docs/hub/en/spaces-overview
- https://help.pythonanywhere.com/pages/ASGIAPI/
