"""Reuse the original structured provider, with a durable web usage ledger.

No client, credentials or model request is constructed by a status check.
"""
from datetime import date
import hashlib
import json
import os
import sqlite3
from threading import RLock
from uuid import UUID

from fastapi import HTTPException
from pydantic import Field, StrictBool
from typing import Literal
from celebrai.ai import LiveProvider
from celebrai.models import Model, Plan, Suggestions

Workflow = Literal['planning', 'ideas', 'copilot', 'rescue', 'critic']

class HistoryMessage(Model):
    role: Literal['user', 'assistant']
    content: str = Field(max_length=1000)

class AIRequest(Model):
    revision: int = Field(ge=0)
    request_id: UUID
    approved: StrictBool = False
    instruction: str = Field(default='', max_length=1000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=8)
    target: int | None = Field(default=None, gt=0, le=10**12)
    protected: list[str] = Field(default_factory=list, max_length=50)

class AIReview(Model):
    summary: str
    findings: list[str]
    next_actions: list[str]
    revision: int
    subjective: bool = True

class AIResult(Model):
    mode: Literal['live'] = 'live'
    workflow: Workflow
    answer: str
    suggestions: Suggestions
    proposal: dict | None = None
    review: AIReview | None = None

class AIService:
    def __init__(self, path: str):
        self.path = path
        self.lock = RLock()
        self.providers = {name: LiveProvider() for name in ['planning','ideas','copilot','rescue','critic']}

    def connect(self):
        from pathlib import Path
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self.path, timeout=10)
        db.execute('CREATE TABLE IF NOT EXISTS web_ai_requests (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, day TEXT NOT NULL, state TEXT NOT NULL, result TEXT)')
        return db

    def status(self):
        try: limit = min(100, max(1, int(os.getenv('CELEBRAI_WEB_AI_DAILY_LIMIT','5'))))
        except ValueError: limit = 5
        with self.connect() as db:
            used = db.execute('SELECT count(*) FROM web_ai_requests WHERE day=?', (str(date.today()),)).fetchone()[0]
        enabled = os.getenv('CELEBRAI_LIVE_ENABLED','false').lower() == 'true'
        configured = bool(os.getenv('OPENAI_API_KEY') and os.getenv('OPENAI_MODEL'))
        return {'enabled':enabled, 'configured':configured, 'ready':enabled and configured and used < limit,
                'remaining':max(0,limit-used), 'daily_limit':limit, 'max_output_tokens':2200,
                'max_retries':1, 'timeout_seconds':25, 'per_workflow_process_limit':3,
                'message':'Live AI is ready; every request still requires approval.' if enabled and configured else 'Configure the server environment to enable Live AI. Offline Demo remains available.'}

    def run(self, plan: Plan, workflow: Workflow, edit: AIRequest, instruction: str) -> Suggestions:
        if not edit.approved:
            raise HTTPException(403, 'Explicit approval is required for each potentially paid AI request.')
        if len(instruction)>2000: raise HTTPException(422, 'AI context is too long. Shorten the request or conversation.')
        # Reduce unnecessary transmission. Contact details are never needed for planning suggestions.
        context = plan.model_copy(deep=True)
        for vendor in context.vendors: vendor.contact = ''
        if len(context.model_dump_json()) + len(instruction) > 30000:
            raise HTTPException(422, 'This plan exceeds the live context limit. Shorten notes before requesting AI.')
        fingerprint = hashlib.sha256(json.dumps([plan.id,workflow,edit.model_dump(mode='json'),instruction],sort_keys=True).encode()).hexdigest()
        key = str(edit.request_id)
        with self.lock, self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            existing = db.execute('SELECT fingerprint,state,result FROM web_ai_requests WHERE id=?',(key,)).fetchone()
            if existing:
                if existing[0] != fingerprint: raise HTTPException(409,'This approval ID was already used for another request.')
                if existing[1] == 'done': return Suggestions.model_validate_json(existing[2])
                raise HTTPException(409,'This approved request was already attempted. Review its outcome before approving another request.')
            status = self.status()
            if not status['enabled'] or not status['configured']:
                raise HTTPException(503,'Live AI is not configured on the server. Switch to Offline Demo or configure the server environment.')
            if not status['remaining']: raise HTTPException(429,'The daily AI request limit has been reached. Offline Demo remains available.')
            if self.providers[workflow].calls >= 3: raise HTTPException(429,'This workflow reached its three-request process limit. Other workflows and Offline Demo remain available.')
            db.execute('INSERT INTO web_ai_requests VALUES (?,?,?,?,NULL)',(key,fingerprint,str(date.today()),'pending'))
        try:
            with self.lock:
                raw = self.providers[workflow].generate(context,workflow,instruction,approved=True)
            result = Suggestions.model_validate(raw)
            if not result.overview.strip() or len(result.model_dump_json())>32000 or any(len(getattr(result,k))>40 for k in ['themes','activities','food','logistics','risks','next_actions','ideas']):
                raise ValueError('Invalid model response')
        except Exception:
            with self.connect() as db: db.execute('UPDATE web_ai_requests SET state=? WHERE id=?',('failed',key))
            # Never return SDK exceptions: they can contain request metadata or credentials.
            raise HTTPException(502,'The AI provider could not return a valid complete response. Your saved plan is unchanged. This attempt counts toward the usage limit; no automatic frontend retry was made.') from None
        with self.connect() as db:
            db.execute('UPDATE web_ai_requests SET state=?,result=? WHERE id=?',('done',result.model_dump_json(),key))
        return result
