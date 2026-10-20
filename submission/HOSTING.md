# Hosting and publication

The verified final video is uploaded privately: [Momenta final demo](https://drive.google.com/file/d/1XDARxC-xE-c1jaHbw7NWyblc-bSfNNmv/view). Drive confirms owner-only permission and shared=false. The downloaded copy matches local bytes and passes decoding/playback. Public link access and unauthenticated playback have not been approved or verified. No GitHub repository or deployed preview exists.

## Prepared final-video metadata

**Title:** Momenta — AI Event Studio | PromptWars Virtual 2026

**Description:** A GenAI-powered celebration and event planning assistant that creates personalized plans, budgets, timelines, vendor checklists, and AI-powered budget optimization.

**Current visibility:** Google Drive Restricted / owner only. Proposed next step: Anyone with the link / Viewer, only after explicit approval.

Use this metadata only for the genuine final video. Rehearsals must retain “Offline rehearsal — no live model calls.” The year is owner-provided, not an independently verified organizer rule.

## YouTube manual workflow (after approval)

1. Sign into the intended YouTube Studio account.
2. Choose **Create → Upload videos** and select verified `Momenta_PromptWars_Final.mp4`.
3. Enter the prepared metadata, select the matching live thumbnail, and answer audience questions accurately.
4. Choose **Unlisted** under Visibility. Stop before publication until owner approval is explicit.
5. Once saved/processed, copy the actual URL and test playback while signed out. Then insert it into README and make the thumbnail clickable.

Official instructions: [upload](https://support.google.com/youtube/answer/57407?hl=en), [visibility](https://support.google.com/youtube/answer/157177?hl=en).

## Google Drive manual workflow (after approval)

1. Sign into the intended Drive account and upload the verified final MP4.
2. Open **Share**. Obtain explicit approval before changing access.
3. Set **General access → Anyone with the link → Viewer**, if account policy permits. Save and copy the real link.
4. Test link access and playback while signed out, then update README.

Official [sharing instructions](https://support.google.com/drive/answer/2494822?hl=en). Anyone holding an unlisted/link-accessible URL can reshare it; it is not private to judges.

## Repository gate

Target name: `momenta-ai-event-studio`. After a real video URL exists, update README, verify tests/build, run `scripts/audit_submission.py`, review staged changes and prepare the final commit. Ask before pushing or creating/changing a public repository. MP4s remain outside Git. Never invent video, repository or submission URLs.
