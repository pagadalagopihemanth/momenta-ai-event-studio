# Making room for the moment: building Momenta

**Unpublished draft.** Verify tooling eligibility, add the real approved repository/demo links and disclose the final live-verification status before publishing. This draft does not claim Google Antigravity use.

Event planning looks creative from the outside, but much of the work is coordination: keeping a budget balanced, protecting important choices, tracking deadlines and making sure no detail disappears between conversations. Momenta brings these decisions into one workspace for weddings, birthdays and community events.

I developed the application iteratively with AI assistance through Codex. The original Python/Streamlit planner remains runnable. A React and TypeScript studio calls those same planning services through a thin FastAPI adapter, with SQLite retaining saved plans. The visual migration changed the product identity to Momenta without replacing the working financial engine or user data.

The central design decision was to give language models responsibility for suggestions and explanations, while Python retains responsibility for money and persistence. Five dedicated prompts cover planning, creative ideas, conversation, Budget Rescue and criticism. Pydantic validates structured responses. Live calls are server-side, explicitly approved and bounded by usage controls; suggested changes have a separate confirmation step.

Budget Rescue made that separation concrete. For an illustrative Bengaluru wedding with 300 guests, the genuine live demonstration reduces the budget from INR 900,000 to INR 700,000 while preserving catering and photography. The application recalculates flexible categories exactly and adds renegotiation tasks. An impossible INR 1,000 target is rejected visibly, rather than producing a reassuring but unusable plan.

Verification combined financial and persistence tests, frontend interaction tests, and real browser actions. The submission recorder creates a separate database, enters the brief, navigates the plan, confirms rescue and downloads a PDF. The final 3:36.83 recording includes two genuine gpt-6-luna responses for planning and rescue, with structured validation and confirmed saving. The deterministic impossible-budget segment is explicitly labeled offline/no model call. No template output is presented as genuine GenAI.

The result is a working local planner and a reproducible preparation workflow. Before submission, the remaining work is organizer clarification about build-tool requirements, public video-access approval, a required live preview and approved publication. Those gates are part of the engineering story, not details to hide.
