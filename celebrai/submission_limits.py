"""Opt-in recording allowance; reserves both possible SDK attempts before sending.

Rates verified 2026-10-21 for gpt-6-luna Standard. This is an estimate guard,
not an account-wide billing limit. Failed/uncertain attempts retain reservations.
"""
import json
import os
from pathlib import Path
import sqlite3


def connect():
    path = Path(os.environ['CELEBRAI_SUBMISSION_LEDGER'])
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.execute('CREATE TABLE IF NOT EXISTS allowance (workflow TEXT PRIMARY KEY, reserved REAL, input_tokens INTEGER, output_tokens INTEGER, estimated_usd REAL)')
    return db


def reserve(model: str, workflow: str, prompt: str, payload: str, schema: dict) -> float:
    if model != 'gpt-6-luna' or workflow not in ('planning', 'rescue'):
        raise ValueError('Submission allowance permits only gpt-6-luna planning and rescue')
    # UTF-8 bytes conservatively bound text tokens; allow substantial schema/framing overhead.
    bound = len((prompt + payload + json.dumps(schema)).encode('utf-8')) + 8192
    if bound > 100000:
        raise ValueError('Submission input token allowance exceeded')
    amount = 2 * (bound * .10 + 2200 * .50) / 1_000_000
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        if db.execute('SELECT 1 FROM allowance WHERE workflow=?', (workflow,)).fetchone():
            raise ValueError('Submission workflow already attempted; do not repeat paid recording')
        used = db.execute('SELECT COALESCE(SUM(reserved),0) FROM allowance').fetchone()[0]
        if used + amount > .10:
            raise ValueError('Projected submission spending exceeds $0.10')
        db.execute('INSERT INTO allowance VALUES (?,?,NULL,NULL,NULL)', (workflow, amount))
    return amount


def record_usage(workflow: str, usage) -> None:
    if usage is None:
        return
    estimate = (usage.input_tokens * .10 + usage.output_tokens * .50) / 1_000_000
    with connect() as db:
        db.execute('UPDATE allowance SET input_tokens=?,output_tokens=?,estimated_usd=? WHERE workflow=?',
                   (usage.input_tokens, usage.output_tokens, estimate, workflow))
