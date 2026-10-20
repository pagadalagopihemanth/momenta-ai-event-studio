# Momenta | AI Event Studio: two-minute judge walkthrough

Use the **2-minute demo** control in the React top bar. Offline Demo works without credentials and demonstrates the full confirmation/persistence experience. For model-backed demonstration, configure the server and select Live AI first; approve each call separately. Timing is a suggested presentation pace, not an official challenge limit.

| Time | Action | What to say |
| --- | --- | --- |
| 0:00–0:20 | Create the prefilled wedding through the two-step form | “A Bengaluru wedding for 300 guests, INR 900,000, Telugu traditions and a vegetarian menu. Everything is illustrative.” |
| 0:20–0:40 | Open Planning Studio; generate and review/apply the plan | “Offline templates keep the demo accessible. Live AI uses structured, validated model responses; it needs a separate paid-call approval.” |
| 0:40–0:55 | Open Budget Studio; review the allocations and chart; acknowledge the step | “Python owns every financial calculation. AI suggestions cannot silently replace these totals.” |
| 0:55–1:20 | Open Budget Rescue; enter INR 700,000; protect Catering and Photography; preview | “The engine protects priorities and actual expenses, finds savings and adds renegotiation tasks. Live AI explains practical trade-offs.” |
| 1:20–1:30 | Check the review confirmation and apply | “The current plan changes only after explicit confirmation, with stale-write protection.” |
| 1:30–1:45 | Inspect Readiness; optionally run the critic; acknowledge the step | “The score shows its formula. A live model critique is a separate subjective review and does not certify readiness.” |
| 1:45–2:00 | Download the walkthrough PDF | “The complete plan is shareable. Budget, timeline and vendor CSVs also download through the browser.” |

The walkthrough advances after actual creation and confirmed plan changes. Budget/readiness steps use explicit acknowledgements. The export step completes after the validated file is passed to the browser download action; inspect browser downloads to see the file.

If asked about the AI engineering: show `prompts/`, the reused Python provider, the per-request consent dialog and `docs/AI_INTEGRATION.md`. Mention the independent critic role, typed JSON, untrusted-input handling, model-failure errors and human review. Never claim the offline engine is a language model. No paid request is necessary to present the offline walkthrough.
