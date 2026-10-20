# Start the new CelebrAI Studio

The original Streamlit app is preserved. The new interface lives in `frontend/` and reuses Python through `webapi/`.

From this folder:

```powershell
.\.venv\Scripts\python -m pip install -r requirements-web.txt
cd frontend
npm ci
npm run build
cd ..
.\.venv\Scripts\python -m uvicorn webapi.app:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000**. Dependencies only need installing once; after building, start future sessions with just the last Python command. The API discovers the built frontend at startup.

No API key or paid service is needed. All reference images are bundled locally. Existing Streamlit data is preserved; web events use a separate database by default.

Start with **2-minute demo** in the top bar. It walks through creating a wedding, personalized generation, budget review, protected Budget Rescue, explicit confirmation, readiness and a real PDF download.

The React UI now supports **Offline Demo** and **Live AI**. Offline is the default. To enable the optional live provider, configure `CELEBRAI_LIVE_ENABLED=true`, `OPENAI_API_KEY` and `OPENAI_MODEL` in the **Python server process**, then restart it. `.env.example` is a reference; `.env` files are not loaded automatically. Never use Vite variables for a secret. Enabling Live AI does not initiate a call: each request requires its own approval dialog, and applying a plan still requires a separate confirmation. See [AI integration and cost controls](docs/AI_INTEGRATION.md).

To launch the original fallback:

```powershell
.\.venv\Scripts\python -m streamlit run app.py
```

See [complete frontend guide](frontend/README.md), [migration architecture](docs/MIGRATION.md) and [verification record](docs/WEB_VERIFICATION.md).
