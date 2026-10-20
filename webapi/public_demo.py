"""Isolated, offline-only public demo. Never mount the local private application.

One process/worker, HTTPS and a persistent directory are required in production.
Anonymous workspaces are browser capabilities, not registered user accounts.
"""
import asyncio
from collections import OrderedDict
from http.cookies import SimpleCookie
import hashlib
import hmac
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
from urllib.parse import urlsplit

from starlette.requests import Request
from starlette.responses import JSONResponse

from celebrai.storage import Store
from .app import create_app

COOKIE = '__Host-momenta-demo'


class PublicDemo:
    TTL = 24 * 3600
    MAX_SESSIONS = 100
    MAX_BYTES = 64 * 1024 * 1024
    BODY_LIMIT = 128 * 1024

    def __init__(self, root: Path, secret: str, origin: str):
        parsed = urlsplit(origin)
        if len(secret) < 32 or parsed.scheme != 'https' or not parsed.hostname or parsed.path not in ('', '/') or parsed.query or parsed.fragment:
            raise ValueError('Public demo needs a 32+ character secret and canonical HTTPS origin')
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.secret = secret.encode()
        self.origin = origin.rstrip('/')
        self.host = parsed.netloc.lower()
        self.cache = OrderedDict()
        self.slots = asyncio.Semaphore(4)
        self.global_bucket = (0, 0)
        with self.db() as db:
            db.execute('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires REAL, bucket INTEGER, hits INTEGER)')

    def db(self):
        return sqlite3.connect(self.root / 'sessions.sqlite', timeout=5)

    def token(self, sid):
        return sid + '.' + hmac.new(self.secret, sid.encode(), hashlib.sha256).hexdigest()

    def identify(self, value):
        if not value or not re.fullmatch(r'[a-f0-9]{64}\.[a-f0-9]{64}', value):
            return None
        sid = value.split('.')[0]
        return sid if hmac.compare_digest(self.token(sid), value) else None

    def session(self, value, create):
        now = time.time()
        bucket = int(now // 60)
        sid = self.identify(value)
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            expired = db.execute('SELECT id FROM sessions WHERE expires<=?', (now,)).fetchall()
            for (old,) in expired:
                self.cache.pop(old, None)
                # Only generated, validated file names inside the dedicated demo root.
                if re.fullmatch(r'[a-f0-9]{64}', old):
                    for suffix in ('.sqlite', '.sqlite-wal', '.sqlite-shm', '.sqlite-journal'):
                        try:
                            (self.root / (old + suffix)).unlink(missing_ok=True)
                        except OSError:
                            # Windows can retain a SQLite handle briefly. Revoke access
                            # regardless; cleanup of orphaned files is retried below.
                            pass
            db.execute('DELETE FROM sessions WHERE expires<=?', (now,))
            active = {r[0] for r in db.execute('SELECT id FROM sessions')}
            for orphan in self.root.glob('*.sqlite'):
                if re.fullmatch(r'[a-f0-9]{64}', orphan.stem) and orphan.stem not in active:
                    try:
                        orphan.unlink(missing_ok=True)
                    except OSError:
                        pass
            row = db.execute('SELECT expires,bucket,hits FROM sessions WHERE id=?', (sid,)).fetchone() if sid else None
            new = False
            if row is None:
                if not create:
                    return None, False, 'expired'
                count = db.execute('SELECT count(*) FROM sessions').fetchone()[0]
                if count >= self.MAX_SESSIONS:
                    return None, False, 'capacity'
                sid = secrets.token_hex(32)
                db.execute('INSERT INTO sessions VALUES (?,?,?,0)', (sid, now + self.TTL, bucket))
                row = (now + self.TTL, bucket, 0)
                new = True
            hits = row[2] if row[1] == bucket else 0
            if hits >= 60:
                return None, False, 'rate'
            db.execute('UPDATE sessions SET bucket=?,hits=? WHERE id=?', (bucket, hits + 1, sid))
        return sid, new, None

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'lifespan':
            while True:
                message = await receive()
                if message['type'] == 'lifespan.startup':
                    await send({'type': 'lifespan.startup.complete'})
                elif message['type'] == 'lifespan.shutdown':
                    await send({'type': 'lifespan.shutdown.complete'})
                    return
        if scope['type'] != 'http':
            return
        request = Request(scope)
        path, method = scope['path'], scope['method']

        async def respond(payload, status=200):
            return await JSONResponse(payload, status_code=status, headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})(scope, receive, send)

        # Provider health probes may use an internal Host. This constant response
        # creates no session and discloses no records, credentials or filesystem paths.
        if path == '/api/health':
            return await respond({'status': 'ok', 'mode': 'offline', 'public_demo': True, 'workspace_hours': 24})
        if request.headers.get('host', '').lower() != self.host:
            return await respond({'detail': 'Invalid host'}, 400)
        if request.headers.get('origin') not in (None, self.origin) or request.headers.get('sec-fetch-site') == 'cross-site':
            return await respond({'detail': 'Cross-site requests are not allowed'}, 403)
        if path == '/api/ai/status':
            return await respond({'enabled': False, 'configured': False, 'ready': False, 'remaining': 0, 'daily_limit': 0,
                                  'max_output_tokens': 0, 'max_retries': 0, 'timeout_seconds': 0, 'per_workflow_process_limit': 0,
                                  'message': 'Public Offline Demo: live model requests are disabled. See the verified genuine AI video.'})
        if '/ai/' in path or path.startswith(('/docs', '/redoc', '/openapi')):
            return await respond({'detail': 'Live AI and API documentation are disabled in the public demo'}, 403)
        if method not in ('GET', 'HEAD', 'POST', 'PUT'):
            return await respond({'detail': 'Method not allowed'}, 405)

        # Bound admission globally as well as by session. Not a substitute for provider DDoS controls.
        bucket = int(time.time() // 60)
        count = self.global_bucket[1] if self.global_bucket[0] == bucket else 0
        self.global_bucket = (bucket, count + 1)
        if count >= 300:
            return await respond({'detail': 'Demo is busy. Try again in a minute.'}, 429)

        body = bytearray()
        if method in ('POST', 'PUT'):
            try:
                while True:
                    chunk = await asyncio.wait_for(receive(), timeout=10)
                    if chunk['type'] == 'http.disconnect':
                        return
                    body.extend(chunk.get('body', b''))
                    if len(body) > self.BODY_LIMIT:
                        return await respond({'detail': 'Demo request exceeds 128 KiB'}, 413)
                    if not chunk.get('more_body'):
                        break
            except asyncio.TimeoutError:
                return await respond({'detail': 'Request timed out'}, 408)
            if sum(p.stat().st_size for p in self.root.glob('*.sqlite*') if p.is_file()) > self.MAX_BYTES:
                return await respond({'detail': 'Demo storage is full. Export your plan and try later.'}, 503)

        body_sent = False
        async def replay():
            nonlocal body_sent
            if body_sent:
                return await receive()
            body_sent = True
            return {'type': 'http.request', 'body': bytes(body), 'more_body': False}

        # Static assets do not create sessions or open any database containing user plans.
        is_api = path.startswith('/api/')
        cookie = SimpleCookie()
        try:
            cookie.load(request.headers.get('cookie', ''))
        except Exception:
            return await respond({'detail': 'Invalid session cookie'}, 401)
        value = cookie[COOKIE].value if COOKIE in cookie else None
        if is_api:
            sid, new, error = self.session(value, path == '/api/bootstrap' and method == 'POST')
            if error:
                return await respond({'detail': 'Workspace expired: refresh to start a new demo.' if error == 'expired' else 'Demo capacity reached. Try again later.'}, 401 if error == 'expired' else 429)
        else:
            sid, new = 'assets', False

        if sid not in self.cache:
            if len(self.cache) >= 16:
                self.cache.popitem(last=False)
            self.cache[sid] = create_app(str(self.root / (sid + '.sqlite')), allowed_origins=[self.origin])
        app = self.cache[sid]
        self.cache.move_to_end(sid)
        if path == '/api/plans' and method == 'POST' and len(Store(str(self.root / (sid + '.sqlite'))).list()) >= 10:
            return await respond({'detail': 'Demo allows 10 celebrations per browser workspace'}, 429)

        async def protected_send(message):
            if message['type'] == 'http.response.start':
                headers = [(k, v) for k, v in message.get('headers', []) if k.lower() != b'cache-control']
                headers.extend([(b'cache-control', b'no-store'), (b'x-content-type-options', b'nosniff'),
                                (b'x-frame-options', b'DENY'), (b'referrer-policy', b'no-referrer'),
                                (b'content-security-policy', b"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")])
                if new:
                    headers.append((b'set-cookie', f'{COOKIE}={self.token(sid)}; Path=/; Max-Age={self.TTL}; Secure; HttpOnly; SameSite=Strict'.encode()))
                message = {**message, 'headers': headers}
            await send(message)

        async with self.slots:
            await app(scope, replay if method in ('POST', 'PUT') else receive, protected_send)


def create_public_app():
    origin = os.getenv('MOMENTA_PUBLIC_ORIGIN')
    if not origin and os.getenv('RENDER_EXTERNAL_HOSTNAME'):
        origin = 'https://' + os.environ['RENDER_EXTERNAL_HOSTNAME']
    if not origin:
        raise ValueError('Set MOMENTA_PUBLIC_ORIGIN to the public HTTPS URL')
    return PublicDemo(Path(os.getenv('MOMENTA_DEMO_DATA', 'public-demo-data')),
                      os.getenv('MOMENTA_SESSION_SECRET', ''), origin)
