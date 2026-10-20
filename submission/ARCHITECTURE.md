# Technical architecture

React/TypeScript/Tailwind Studio calls a FastAPI adapter around existing Python domain services. Pydantic validates inputs and structured suggestions. SQLite persists plans with revision checks. Generated proposals require confirmation before saving.

Five workflows reuse OpenAI Responses structured output: planning, ideas, copilot, rescue and critic. Versioned prompts define responsibilities/schema. Untrusted brief/conversation data is separated from instructions; vendor contacts are redacted. A durable request ledger, request IDs, limits, timeouts and bounded retries provide basic cost controls. Keys stay server-side.

Budget Rescue computes protected allocations, expense floors and exact integer minor-unit totals in Python, then optionally asks AI for concrete trade-offs. Preview includes monetary changes and renegotiation tasks. What-if simulation does not mutate saved plans. Readiness uses a disclosed formula; AI critique is separate and subjective.

ReportLab renders PDF; Pandas produces CSV with formula-injection handling. Optional branding preserves original exports. Streamlit remains runnable. The recording harness uses an isolated database and actual UI actions; Playwright captures footage/cursor and local FFmpeg adds captions. Offline footage is persistently labeled rehearsal.
