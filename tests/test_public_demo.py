from datetime import date, timedelta
import sqlite3
import pytest
from fastapi.testclient import TestClient
from webapi.public_demo import PublicDemo, COOKIE

ORIGIN = 'https://demo.example'
SECRET = 'test-secret-not-used-for-deployment-' * 2


def client(root):
    return TestClient(PublicDemo(root, SECRET, ORIGIN), base_url=ORIGIN)


def wedding():
    return {'name': 'Isolated wedding', 'kind': 'Wedding', 'date': str(date.today() + timedelta(days=100)),
            'city': 'Bengaluru', 'budget': 90000000, 'guests': 300, 'priorities': ['Catering', 'Photography']}


def test_cross_browser_records_exports_and_proposals_are_isolated(tmp_path):
    app = PublicDemo(tmp_path, SECRET, ORIGIN)
    with TestClient(app, base_url=ORIGIN) as a, TestClient(app, base_url=ORIGIN) as b:
        ra = a.post('/api/bootstrap')
        assert ra.status_code == 200
        assert all(v in ra.headers['set-cookie'] for v in ('Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/'))
        b.post('/api/bootstrap')
        p = a.post('/api/plans', json=wedding()).json()
        assert p['id'] not in [r['id'] for r in b.get('/api/plans').json()]
        assert b.get(f"/api/plans/{p['id']}").status_code == 404
        assert b.get(f"/api/plans/{p['id']}/exports/pdf").status_code == 404
        assert b.put(f"/api/plans/{p['id']}/event", json={'revision':p['revision'],'event':p['event']}).status_code == 404
        preview = a.post('/api/plans/web-demo-0/rescue', json={'revision':1,'target':70000000,'protected':['Catering','Photography']}).json()
        confirm = {'token':preview['token'],'confirmed':True}
        assert b.post('/api/plans/web-demo-0/confirm', json=confirm).status_code == 410
        assert a.post('/api/plans/web-demo-0/confirm', json=confirm).status_code == 200
        assert b.get('/api/plans/web-demo-0').json()['event']['budget'] == 90000000
        assert a.get('/api/plans/web-demo-0/exports/pdf?brand=momenta').content.startswith(b'%PDF')


def test_live_ai_cannot_be_enabled_by_server_key_or_browser(tmp_path, monkeypatch):
    from celebrai.ai import LiveProvider
    monkeypatch.setenv('CELEBRAI_LIVE_ENABLED', 'true')
    monkeypatch.setenv('OPENAI_API_KEY', 'fake-test-key')
    monkeypatch.setattr(LiveProvider, 'generate', lambda *a, **k: pytest.fail('Public demo invoked AI'))
    with client(tmp_path) as c:
        s = c.get('/api/ai/status').json()
        assert not s['enabled'] and not s['configured'] and s['remaining'] == 0
        for w in ('planning','rescue','ideas','copilot','critic'):
            assert c.post(f'/api/plans/web-demo-0/ai/{w}', json={'approved':True}).status_code == 403


def test_origin_host_cookie_expiry_and_local_database_separation(tmp_path, monkeypatch):
    private = tmp_path / 'owner-private.db'
    monkeypatch.setenv('CELEBRAI_WEB_DB', str(private))
    root = tmp_path / 'demo'
    with client(root) as c:
        assert c.post('/api/bootstrap', headers={'origin':'https://evil.example'}).status_code == 403
        assert c.post('/api/bootstrap', headers={'sec-fetch-site':'cross-site'}).status_code == 403
        assert c.get('/api/plans', headers={'host':'evil.example'}).status_code == 400
        assert c.get('/api/health', headers={'host':'127.0.0.1:10000'}).json()['status'] == 'ok'
        assert c.get('/api/plans').status_code == 401
        c.post('/api/bootstrap')
        value = c.cookies[COOKIE]
        with sqlite3.connect(root/'sessions.sqlite') as db:
            db.execute('UPDATE sessions SET expires=0')
        assert c.get('/api/plans').status_code == 401
        assert c.post('/api/bootstrap').status_code == 200
        assert c.cookies[COOKIE] != value
    assert not private.exists()


def test_restart_persistence_tampering_and_request_limits(tmp_path):
    with client(tmp_path) as c:
        c.post('/api/bootstrap')
        p = c.post('/api/plans', json=wedding()).json()
        cookie = c.cookies[COOKIE]
    with client(tmp_path) as c:
        c.cookies.set(COOKIE, cookie, domain='demo.example', path='/')
        assert c.get(f"/api/plans/{p['id']}").status_code == 200
        assert c.post('/api/plans', content=b'x'*(128*1024+1)).status_code == 413
        for _ in range(6): assert c.post('/api/plans',json=wedding()).status_code == 201
        assert c.post('/api/plans',json=wedding()).status_code == 429
        with sqlite3.connect(tmp_path/'sessions.sqlite') as db:
            db.execute('UPDATE sessions SET hits=60')
        assert c.get('/api/plans').status_code == 429
    with client(tmp_path) as c:
        c.cookies.set(COOKIE, cookie[:-1] + ('a' if cookie[-1]!='a' else 'b'), domain='demo.example', path='/')
        assert c.get('/api/plans').status_code == 401


def test_public_configuration_fails_closed(tmp_path):
    with pytest.raises(ValueError): PublicDemo(tmp_path, 'short', ORIGIN)
    with pytest.raises(ValueError): PublicDemo(tmp_path, SECRET, 'http://demo.example')


def test_capacity_storage_and_headers(tmp_path):
    app = PublicDemo(tmp_path, SECRET, ORIGIN)
    app.MAX_SESSIONS = 1
    with TestClient(app, base_url=ORIGIN) as a, TestClient(app, base_url=ORIGIN) as b:
        response = a.post('/api/bootstrap')
        assert response.status_code == 200
        assert response.headers['cache-control'] == 'no-store'
        assert "frame-ancestors 'none'" in response.headers['content-security-policy']
        assert b.post('/api/bootstrap').status_code == 429
        app.MAX_BYTES = 0
        assert a.post('/api/plans', json=wedding()).status_code == 503
