# Minimal legitimate Antigravity workflow — eligibility unconfirmed

Public rules checked 2026-10-21: https://promptwars.in/promptwarsVirtual.html
The page conflicts and says the program is being refreshed. Only the organizer can confirm whether retrospective work on an existing app qualifies. No rebuild is technically needed to open and test this repository. Testing alone may not satisfy “build”; do not claim otherwise.

1. Authenticate in the official Antigravity application and open the existing CelebrAI repository as a trusted project. Review the dirty Git state before changing anything. Keep secrets and databases outside agent context; leave paid AI disabled.
2. Give the agent this focused prompt:

> This is an existing application. Do not redesign or rebuild it. Review Budget Rescue protected expenses, impossible-budget rejection, structured AI validation and export handling. Run `.\.venv\Scripts\python -m pytest -q`; in frontend run `npm test` and `npm run build`. Identify one genuinely missing regression case and add a meaningful test, or fix a confirmed defect with a regression test. Preserve SQLite data and the Streamlit fallback. Do not read credentials, call paid APIs, upload, deploy or push. Show the proposed diff before applying it. If no defect or missing case exists, report that honestly.

3. Review the actual diff, rerun the affected checks, and retain Antigravity prompts, artifacts, screenshots and outputs with their real dates. Describe only the work it actually did. Never backdate usage or manufacture a change solely to claim eligibility.
4. Send ORGANIZER_QUESTION.txt yourself, or explicitly authorize sending it through an available channel. Await written confirmation before claiming eligibility.

Official project guidance: https://www.antigravity.google/docs/projects/
