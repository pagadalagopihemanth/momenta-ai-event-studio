"""Local HTTPS smoke test of the public deployment entry point. No model calls."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen
import ssl
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT/'submission/private/public-demo-qa'


def main():
    if not (QA/'cert.pem').exists():
        raise SystemExit('Generate a temporary localhost test certificate as documented in docs/DEPLOYMENT.md')
    run = QA / secrets.token_hex(8)
    run.mkdir(parents=True)
    env = {**os.environ, 'MOMENTA_PUBLIC_ORIGIN':'https://localhost:8001',
           'MOMENTA_SESSION_SECRET':secrets.token_urlsafe(40), 'MOMENTA_DEMO_DATA':str(run/'sessions')}
    for key in ('OPENAI_API_KEY','OPENAI_MODEL'):
        env.pop(key, None)
    env['CELEBRAI_LIVE_ENABLED']='false'
    os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(Path(tempfile.gettempdir())/'MomentaPlaywright'))
    log = (run/'server.log').open('w')
    server = subprocess.Popen([sys.executable,'-m','uvicorn','webapi.public_demo:create_public_app','--factory',
         '--host','127.0.0.1','--port','8001','--ssl-keyfile',str(QA/'key.pem'),'--ssl-certfile',str(QA/'cert.pem')],
         cwd=ROOT,env=env,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    try:
        tls = ssl._create_unverified_context() # local generated certificate only; never used for public verification
        for _ in range(100):
            try:
                with urlopen('https://localhost:8001/api/health',context=tls,timeout=1) as r:
                    assert json.load(r)['public_demo']
                break
            except OSError:time.sleep(.2)
        else:raise RuntimeError('Local public-demo server did not start')
        assert server.poll() is None
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            a = browser.new_context(ignore_https_errors=True,viewport={'width':1440,'height':1000})
            b = browser.new_context(ignore_https_errors=True,viewport={'width':390,'height':844})
            page = a.new_page();mobile=b.new_page();errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto('https://localhost:8001/',wait_until='networkidle')
            expect(page.get_by_role('note')).to_contain_text('Public Offline Demo')
            page.get_by_role('button',name='Plan with AI',exact=True).click()
            for label,value in [('What are we celebrating?','Public isolation wedding'),('City','Bengaluru'),('Expected guests','300'),('Budget','900000')]:
                page.get_by_label(label,exact=True).fill(value)
            page.get_by_role('button',name='Make it personal',exact=True).click()
            page.get_by_role('checkbox',name='Catering',exact=True).check()
            page.get_by_role('checkbox',name='Photography',exact=True).check()
            page.get_by_role('button',name='Create my celebration',exact=True).click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            plans=a.request.get('https://localhost:8001/api/plans').json()
            wedding=next(p for p in plans if p['event']['name']=='Public isolation wedding')
            mobile.goto('https://localhost:8001/#studio',wait_until='networkidle')
            expect(mobile.get_by_role('note')).to_be_visible()
            assert b.request.get('https://localhost:8001/api/plans/'+wedding['id']).status==404
            assert not b.request.get('https://localhost:8001/api/ai/status').json()['ready']
            assert b.request.post('https://localhost:8001/api/plans/'+wedding['id']+'/ai/planning',data={}).status==403
            page.get_by_role('button',name='Budget studio',exact=True).click()
            page.get_by_role('button',name='Explore a new budget',exact=True).click()
            page.get_by_role('spinbutton',name='Your revised budget',exact=False).fill('700000')
            page.get_by_role('button',name='Preview changes',exact=True).click()
            expect(page.get_by_role('heading',name='A thoughtful change of plans.',exact=True)).to_be_visible()
            page.get_by_role('checkbox',name='I’ve reviewed the changes and confirm saving this proposal.',exact=True).check()
            page.get_by_role('button',name='Apply confirmed changes',exact=True).click()
            expect(page.get_by_role('dialog')).to_have_count(0)
            assert a.request.get('https://localhost:8001/api/plans/'+wedding['id']).json()['event']['budget']==70000000
            export=a.request.get('https://localhost:8001/api/plans/'+wedding['id']+'/exports/pdf?brand=momenta')
            assert export.status==200 and export.body().startswith(b'%PDF')
            page.screenshot(path=str(QA/'desktop.png'))
            mobile.screenshot(path=str(QA/'mobile.png'))
            assert mobile.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
            assert not errors,errors
            browser.close()
        result={'desktop_mobile_smoke_passed':True,'two_browser_workspaces_isolated':True,'budget_rescue_persisted':True,
                'pdf_export_passed':True,'public_ai_blocked':True,'paid_calls':0,'browser_errors':errors,
                'local_https':True,'docker_build_verified':False}
        (ROOT/'submission/deployment-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
        print(json.dumps(result))
    finally:
        server.terminate();server.wait(timeout=10);log.close()

if __name__=='__main__':main()
