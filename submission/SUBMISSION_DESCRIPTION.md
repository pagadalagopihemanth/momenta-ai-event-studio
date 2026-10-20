# Momenta — submission description

Momenta turns a celebration brief into a practical working plan. Built for weddings, birthdays and community events, its React Studio combines structured planning, editable budgets, preparation timelines, vendor checklists and personal creative suggestions in one persistent workspace. The original Streamlit application remains runnable as a fallback.

Its signature Budget Rescue workflow adapts a plan when funding changes: Python preserves protected expenses and recorded spending, reallocates the remaining funds exactly, updates vendor allowances and adds renegotiation tasks. Users review the differences and explicitly confirm before saving.

Momenta works offline through three illustrative Bengaluru scenarios and a guided two-minute wedding walkthrough. Live AI mode reuses the original server-side OpenAI provider for personalized planning, ideas, contextual conversation, rescue recommendations and an independent plan critic. Dedicated versioned prompts and Pydantic validation constrain responses. Language models suggest; Python owns money, dates and persistence. Every potentially paid request needs approval; every saved proposal needs a separate confirmation. Durable usage limits and request IDs protect against accidental repeat requests. What-if comparisons, transparent readiness checks and verified desktop/mobile PDF/CSV downloads turn ideas into action.

Stack: React, TypeScript, Tailwind, Motion, Radix, Lucide, Recharts, FastAPI, Python, Pydantic, SQLite, Pandas, ReportLab, Pytest and Vitest; Streamlit/Plotly fallback preserved. All five model endpoints have mocked integration coverage. Genuine gpt-6-luna planning and rescue requests passed structured validation, proposal confirmation and persistence; estimated combined response cost was $0.0008649. The final 3:36.83 demo is verified at 1080p/30 FPS. This is a local single-planner MVP; actual quotes, safety and cultural suitability require human verification. No claims about challenge judging criteria or deadlines are made. No deployment or GitHub push was performed.

Final demo: https://drive.google.com/file/d/1XDARxC-xE-c1jaHbw7NWyblc-bSfNNmv/view (currently restricted; not yet available to judges).

GitHub repository: not published; no URL yet. Deployed preview: not available. Tooling eligibility remains pending organizer clarification.
