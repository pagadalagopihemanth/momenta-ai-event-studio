# Authorized live run — authentication still required

The owner authorized up to $0.10 on 2026-10-21: one planning and one rescue request, each with at most one SDK retry. Do not spend that allowance on separate preliminary generation and then record again. The recording itself performs the two genuine verification requests.

Recommended model: `gpt-6-luna`, currently supported with Responses structured outputs. Standard rates checked 2026-10-21: $0.10/M input, $0.50/M output. https://developers.openai.com/api/docs/models/gpt-6-luna
At 8,000 input + 2,200 output tokens per request: approximately $0.0038 for both; $0.0076 if both attempts are billed twice. Actual usage is unknown until calls succeed. Taxes and account funding are separate.

## Configure privately

1. In the OpenAI API dashboard, select the intended API project, confirm positive credits/active billing and model permissions. ChatGPT subscriptions do not establish API funding. Create a restricted project key permitting model metadata reads and Responses writes. Do not paste it in chat.
2. In your private PowerShell terminal at the project root, enter the key using a masked prompt (the secret itself never enters command history):

```powershell
$momentaSecret = Read-Host 'OpenAI project key' -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $momentaSecret).Password
$env:OPENAI_MODEL = 'gpt-6-luna'
$env:MOMENTA_BILLING_CONFIRMED = 'true' # only after checking billing yourself
```

These process variables belong to that terminal and its child processes; an already-running Codex/server process will not inherit them. The app does not automatically load `.env`. Do not print environment variables or save the key in source.

3. After billing confirmation, run in that same terminal:

```powershell
.\.venv\Scripts\python scripts/record_submission.py --live --approve-paid
.\.venv\Scripts\python scripts/produce_video.py
.\.venv\Scripts\python scripts/verify_video_playback.py
Remove-Item Env:OPENAI_API_KEY
```

The recorder first performs a metadata-only model-access check (not generation). That check cannot prove funded billing; your dashboard confirmation is required. If it fails, no generation begins.

Before entering a real key, stop any terminal transcript/session recording. If you want Codex to execute instead, configure these variables in the environment used to launch Codex, restart it, and report only that configuration and API billing are ready. Never send the key itself.

The isolated recording enables additional server-side controls only for this run: gpt-6-luna only, Standard service, reasoning none, 2,200 output tokens, at most 100,000 conservatively bounded input tokens (UTF-8 bytes plus schema/framing allowance), planning/rescue only, one logical call per workflow, and at most one SDK retry each. A persistent SQLite allowance ledger at ignored `submission/private/live-allowance.db` reserves the full projected cost including retries before sending. At the maximum accepted input, both workflows including retries reserve at most $0.0444, below $0.10. Unknown/failed attempts retain reservations. Do not delete/reset that ledger to retry; seek fresh authorization. This is a scoped estimate guard, not an account-wide billing cap.

Usage token totals and an uncached Standard-price estimate are saved in that private ledger after a response; a network retry can incur extra unreported usage, covered by the reservation. Final billing must be checked in the API dashboard. No prompt, secret or contact is saved in this ledger.

Successful live footage produces `submission/Momenta_PromptWars_Final.mp4`. Review real model content, frame readability/privacy, full decode and browser playback before approval. Neither recording nor production uploads anything. If recording fails after a paid response, stop and inspect evidence; do not repeat the workflows automatically.
