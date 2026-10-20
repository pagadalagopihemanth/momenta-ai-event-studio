# Original CelebrAI Streamlit fallback

The original `app.py` remains runnable alongside Momenta. Run these commands from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m streamlit run app.py
```

No key is required for Offline Demo. Save an event or load an illustrative wedding, birthday or community scenario. The original app uses `data/celebrai.db`; the React studio uses a separate database. Keep both out of Git.

Original planning, validation, budget, timeline, storage and AI services remain in `celebrai/`. The shared PDF renderer adds optional branding parameters while preserving the original CelebrAI defaults. No Streamlit source rewrite was made.

Live AI requires server configuration and explicit approval; it is separately billed from any ChatGPT subscription. Never put a key in a recorded command or committed file. See [AI integration](AI_INTEGRATION.md) and [Momenta startup](../START_STUDIO.md).
