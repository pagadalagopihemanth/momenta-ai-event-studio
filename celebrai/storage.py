import os
import sqlite3
from pathlib import Path
from .models import Plan

class Store:
    def __init__(self, path: str | None = None):
        self.path = path or os.getenv('CELEBRAI_DB','data/celebrai.db')
        Path(self.path).parent.mkdir(parents=True,exist_ok=True)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL)')
    def connect(self): return sqlite3.connect(self.path,timeout=10)
    def save(self, plan: Plan) -> Plan:
        plan = Plan.model_validate(plan.model_dump())
        result=plan.model_copy(deep=True)
        result.revision+=1
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT revision FROM plans WHERE id=?',(plan.id,)).fetchone()
            if row and row[0]!=plan.revision: raise ValueError('Plan changed in another session. Reload before saving.')
            if not row and plan.revision: raise ValueError('Saved plan no longer exists')
            db.execute('INSERT INTO plans VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, body=excluded.body',(result.id,result.revision,result.model_dump_json()))
        return result
    def list(self) -> list[Plan]:
        with self.connect() as db: return [Plan.model_validate_json(r[0]) for r in db.execute('SELECT body FROM plans ORDER BY rowid DESC')]
