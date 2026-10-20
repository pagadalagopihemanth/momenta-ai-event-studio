# Live GenAI integration

Momenta Studio reuses the original `celebrai.ai.LiveProvider` and its five original versioned prompts. `webapi/ai_service.py` adds web request validation, durable usage accounting, idempotency and safe error handling. Model calls remain on the Python server. The implementation follows the [official OpenAI Structured Outputs pattern](https://developers.openai.com/api/docs/guides/structured-outputs): `responses.parse`, `text_format=Suggestions`, refusal/incomplete handling and Pydantic validation.

## Five workflows

| Route suffix under `/api/plans/{id}/ai/` | Model responsibility | Application behavior |
| --- | --- | --- |
| `planning` | Personalized overview, themes, activities, menus, logistics, risks, next actions and ideas | Preview replacement of written suggestions; preserve Python budget, tasks and vendor records |
| `ideas` | Creative suggestions matched to location, culture, dietary needs, guest count and budget | Preview deduplicated additions to saved ideas |
| `copilot` | Answer with the saved plan and bounded recent conversation as context | Known numerical edits use the original deterministic tools; model supplies the answer and ideas; all proposals require confirmation |
| `rescue` | Explain concrete savings, scope reductions and protected-priority trade-offs | Python first validates/reallocates the budget and adds tasks; the model critiques that candidate and adds recommendations; preview before persistence |
| `critic` | Independent review of feasibility, missing details, conflicts and risk | Read-only subjective review with actionable steps; never changes the rule-based readiness score |

Each route accepts `revision`, a fresh UUID `request_id`, strict boolean `approved`, an optional bounded instruction and conversation history. Rescue additionally requires a target in minor currency units and optional protected categories. `GET /api/ai/status` returns configuration booleans and usage, never keys or credential fragments. There is no browser field for an API key.

## Two separate decisions

1. A per-request dialog discloses potentially paid API use, event-context transmission, token/timeout/retry bounds and remaining usage. The checkbox and approval button must be used before the browser sends a model request. Selecting Live AI mode does not authorize a call. Cancel makes no model request.
2. A resulting plan preview requires its own review checkbox and Apply action. Declining leaves the saved plan unchanged. Critic responses are read-only and do not need a save action.

Offline Demo is the default on every page load. It is clearly labeled and uses the original templates/intent engine. Live failures return an error; the application does not silently represent an offline answer as a model response. Saving event details or a manual idea never invokes a model automatically.

## Limits and data

- Original provider: 2,200 maximum output tokens, 25-second timeout, at most one SDK retry, three attempts per workflow instance. The web adapter uses one original provider instance per workflow.
- Web ledger: default five approved attempts per server date across process restarts, configurable from 1 to 100. Failed attempts count. One approved request can include up to two billable SDK attempts because of the allowed retry.
- An atomic SQLite reservation precedes a call. Matching completed request IDs reuse the validated result. A reused ID with different data, or a pending/failed ID, is rejected. A process crash cannot silently replay a paid request.
- The ledger stores validated model results locally for duplicate protection. It contains no API credentials. Plan data and responses remain in the local SQLite file; use appropriate machine access controls and remove/retain that file according to your own privacy needs.
- Contact fields are removed from vendor records before sending context. The approval dialog discloses that event briefs, financial allowances, tasks, notes and relevant conversation are transmitted. Do not include unnecessary private information in free-text fields.
- Original prompts classify descriptions and requests as untrusted data. Output is validated, never executed as code, SQL, a shell command or a tool instruction. SDK error details are not returned to the browser. Requests use `store=False`.
- Revision checks run before and after generation; a late result against an edited event cannot create a current preview. Original confirmation-token and optimistic-save checks still apply.

## Verification and limits

All five routes are tested with a mocked OpenAI SDK. Tests cover explicit approval, configuration, Pydantic validation, original numeric calculations, confirmation, contact redaction, recent chat context, refusal/error handling, idempotency and persistent usage limits. Frontend tests prove that mode selection and opening the approval dialog do not make a model request, and that approval is required before posting.

Two genuine gpt-6-luna requests (planning and rescue) completed with structured validation and confirmed saving; token-based estimated combined cost was $0.0008649. Other workflows and production refusal behavior remain unverified with live calls. See ../submission/LIVE_RESULTS.md. The original provider now also has an opt-in recording-only spending guard; general application behavior remains unchanged. The local app remains single-user and has no public-hosting authorization boundary. Conversation and critic UI history are temporary. The copilot can propose free-form textual recommendations, while automatic numeric actions remain limited to the supported deterministic intent tools. The readiness score is a progress heuristic, not safety certification. No judging requirements, deadlines or challenge rules beyond the user-provided topic are assumed.
