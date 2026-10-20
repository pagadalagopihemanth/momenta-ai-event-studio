"""Record actual browser interactions in a fresh database; never mock live AI.

Offline is the safe default. --live --approve-paid is reserved for an operator
who has explicitly approved TWO potentially paid requests (and SDK retries).
"""
from __future__ import annotations
import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import tempfile
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SUB = ROOT / "submission"

CURSOR = """() => { const init=()=>{const c=document.createElement('div');
c.id='recording-cursor';c.style.cssText='position:fixed;left:0;top:0;width:24px;height:30px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 2px 2px #0008)';
c.innerHTML='<svg viewBox="0 0 24 30"><path d="M2 1v24l6-6 5 10 4-2-5-10h9Z" fill="white" stroke="#111318" stroke-width="2"/></svg>';
document.body.append(c);document.addEventListener('mousemove',e=>{c.style.left=e.clientX+'px';c.style.top=e.clientY+'px'});};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init(); }"""

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live',action='store_true')
    parser.add_argument('--approve-paid',action='store_true')
    parser.add_argument('--quick',action='store_true',help='Short dry run; never a submission video')
    args=parser.parse_args()
    if args.live and not args.approve_paid:
        parser.error('Live recording requires separate explicit approval: --approve-paid')
    if args.live and not (os.getenv('OPENAI_API_KEY') and os.getenv('OPENAI_MODEL')):
        parser.error('Configure key/model in the server environment; never put secrets in arguments.')
    if args.live:
        if os.getenv('MOMENTA_BILLING_CONFIRMED') != 'true':
            parser.error('Confirm API project billing first: MOMENTA_BILLING_CONFIRMED=true')
        if os.getenv('OPENAI_MODEL') != 'gpt-6-luna':
            parser.error('The verified submission estimate currently permits only gpt-6-luna')
        from openai import OpenAI
        # Metadata lookup only: no generation and no token charges. Never print exception details.
        try:
            OpenAI(api_key=os.environ['OPENAI_API_KEY'],base_url='https://api.openai.com/v1',timeout=15,max_retries=0).models.retrieve('gpt-6-luna')
        except Exception:
            parser.error('Model access preflight failed. Check key, project permissions and network privately.')
    os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(Path(tempfile.gettempdir())/'MomentaPlaywright'))
    from playwright.sync_api import sync_playwright, expect
    run=SUB/'private'/datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    run.mkdir(parents=True)
    env={**os.environ,'CELEBRAI_WEB_DB':str(run/'demo.db'),
         'CELEBRAI_LIVE_ENABLED':'true' if args.live else 'false','CELEBRAI_WEB_AI_DAILY_LIMIT':'2'}
    if args.live:
        env.update(CELEBRAI_SUBMISSION_LIMITS='true',
                   CELEBRAI_SUBMISSION_LEDGER=str(SUB/'private'/'live-allowance.db'))
    log=(run/'server.log').open('w',encoding='utf-8')
    server=subprocess.Popen([sys.executable,'-m','uvicorn','webapi.app:app','--host','127.0.0.1','--port','5173'],cwd=ROOT,env=env,stdout=log,stderr=log,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    scenes=[]; failures=[]; api=[]; started=0.0
    try:
        for _ in range(100):
            try:
                with urlopen('http://127.0.0.1:5173/api/ai/status',timeout=1) as r: status=json.load(r)
                break
            except OSError: time.sleep(.2)
        else: raise RuntimeError('Isolated demo server did not start')
        if server.poll() is not None: raise RuntimeError('Demo port is occupied; no existing server was modified')
        if args.live and not status['ready']: raise RuntimeError('Live AI is not ready; no recording or call started')
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True)
            context=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1,
                record_video_dir=str(run/'raw'),record_video_size={'width':1920,'height':1080},accept_downloads=True)
            context.add_init_script('('+CURSOR+')()')
            page=context.new_page();page.set_default_timeout(15000)
            page.on('pageerror',lambda err: failures.append(str(err)))
            def response(r):
                if '/api/' in r.url:
                    api.append({'path':r.url.split('/api/',1)[1],'status':r.status})
            page.on('response',response)
            started=time.monotonic()
            def scene(name,caption,hold=7):
                scenes.append({'name':name,'caption':caption,'start':round(time.monotonic()-started,3)})
                print(name,flush=True)
                page.screenshot(path=str(run/f'{len(scenes):02}-{name}.png'))
                if not args.quick: page.wait_for_timeout(hold*1000)
            def click(loc):
                loc.scroll_into_view_if_needed(); box=loc.bounding_box()
                if box: page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2,steps=12)
                loc.click();page.wait_for_timeout(300)
            def button(name): return page.get_by_role('button',name=name,exact=True)
            def fill(label,value):
                loc=page.get_by_label(label,exact=True);click(loc);loc.press('ControlOrMeta+A');loc.press_sequentially(value,delay=35)
            def nav(name): click(button(name));page.wait_for_timeout(450)
            def confirm():
                page.get_by_role('checkbox',name='I’ve reviewed the changes and confirm saving this proposal.',exact=True).check()
                click(button('Apply confirmed changes'))
                expect(page.get_by_role('dialog')).to_have_count(0)
            def paid():
                page.get_by_role('checkbox',name='I explicitly approve this potentially paid request and sending this event context to OpenAI.',exact=True).check()
                scene('paid-approval','Live OpenAI request: explicit approval; credentials remain server-side.',3)
                click(button('Approve & request Live AI'))
            page.goto('http://127.0.0.1:5173/',wait_until='networkidle')
            scene('landing','Momenta / AI Event Studio / Make moments happen.',8)
            click(button('Plan with AI'))
            fill('What are we celebrating?','Ananya & Arjun | PromptWars wedding')
            fill('City','Bengaluru');fill('Expected guests','300');fill('Budget','900000')
            assert page.get_by_label('Expected guests',exact=True).input_value()=='300'
            assert page.get_by_label('Budget',exact=True).input_value()=='900000'
            scene('wedding-brief','A real brief: Bengaluru, 300 guests, INR 900,000.',9)
            click(button('Make it personal'))
            fill('Your theme or feeling','Traditional South Indian wedding')
            fill('Cultural, dietary & accessibility preferences','Telugu traditions; vegetarian menu; step-free access; label allergens.')
            page.get_by_role('checkbox',name='Catering',exact=True).check()
            page.get_by_role('checkbox',name='Photography',exact=True).check()
            scene('personalization','Personal priorities, cultural traditions and dietary needs.',8)
            click(button('Create my celebration'));expect(page.get_by_role('dialog')).to_have_count(0)
            scene('dashboard','A persistent command center: budget, countdown and next steps.',9)
            nav('AI planning studio AI')
            if args.live: page.get_by_label('AI mode',exact=True).select_option('live')
            click(button('Generate AI event plan' if args.live else 'Generate offline event plan'))
            if args.live: paid()
            expect(page.get_by_role('heading',name='A thoughtful change of plans.',exact=True)).to_be_visible(timeout=65000)
            scene('generated-plan','Real model output: validated structured suggestions.' if args.live else 'OFFLINE REHEARSAL: template generation, not a model response.',10)
            confirm();page.locator('.plan-sections').scroll_into_view_if_needed();scene('saved-plan','Review and confirm before suggestions become the saved plan.',7)
            nav('Budget studio');scene('budget','Python owns every budget total. Allocations balance to INR 900,000.',9)
            nav('Timeline & tasks');scene('timeline','Date-relative milestones, dependencies and progress.',8)
            nav('Vendor workspace');scene('vendors','Vendor allowances and booking status; no invented businesses or quotes.',7)
            nav('Inspiration board');page.locator('.personal-ideas').scroll_into_view_if_needed();scene('ideas','Personal suggestions plus reference mood boards and reusable palettes.',8)
            nav('Budget studio');click(button('Explore a new budget'))
            page.get_by_role('spinbutton',name='Your revised budget',exact=False).fill('700000')
            scene('rescue-input','Budget Rescue: INR 700,000, protecting Catering and Photography.',8)
            click(button('Preview changes'))
            if args.live: paid()
            expect(page.get_by_role('heading',name='A thoughtful change of plans.',exact=True)).to_be_visible(timeout=65000)
            scene('rescue-comparison','AI trade-offs and deterministic savings.' if args.live else 'OFFLINE REHEARSAL: deterministic savings and trade-offs; no AI call.',13)
            confirm();scene('rescue-saved','Explicit confirmation saves the new budget and updates affected tasks.',7)
            click(button('Explore a new budget'))
            page.get_by_role('spinbutton',name='Your revised budget',exact=False).fill('1000')
            click(button('Preview changes'));expect(page.get_by_role('alert')).to_be_visible()
            scene('unrealistic-budget','Edge case: an impossible budget is rejected. Protected expenses stay safe.',10)
            click(button('Close dialog'));nav('Event readiness')
            scene('readiness','Transparent readiness: unfinished tasks and unconfirmed vendors are visible.',10)
            export=page.get_by_role('button',name='The complete plan',exact=False)
            export.scroll_into_view_if_needed()
            with page.expect_download() as info: click(export)
            info.value.save_as(str(run/'momenta-plan.pdf'))
            scene('export','A real PDF download: the final plan is ready to share.',7)
            # Verify persistence through the actual UI and record only structural evidence.
            nav('Budget studio')
            allocated=page.get_by_role('spinbutton',name='Catering allocated',exact=True).input_value()
            assert float(allocated)==270000
            assert float(page.get_by_role('spinbutton',name='Photography allocated',exact=True).input_value())==108000
            video=page.video
            context.close();video.save_as(str(run/'capture.webm'));browser.close()
        bad=[r for r in api if r['status']>=400 and not (r['path'].endswith('/rescue') and r['status']==422)]
        if failures or bad: raise RuntimeError(f'Browser errors: {len(failures)}; unexpected API errors: {bad}')
        live_calls=[r for r in api if '/ai/' in r['path'] and r['status']==200]
        if args.live and len(live_calls)!=2: raise RuntimeError('Expected two successful genuine AI requests')
        report={'mode':'live' if args.live else 'offline-rehearsal','quick':args.quick,'scenes':scenes,'api':api,
                'errors':failures,'raw_seconds':round(time.monotonic()-started,2),'paid_model_requests':len(live_calls),
                'capture':str(run/'capture.webm'),'isolated_database':True,'success':True}
        (run/'recording.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        (SUB/'latest-recording.json').write_text(json.dumps({'run':str(run),'mode':report['mode'],'quick':args.quick},indent=2),encoding='utf-8')
        print(json.dumps({'recording_complete':True,'mode':report['mode'],'run':str(run)}),flush=True)
    except Exception:
        (run/'failure.json').write_text(json.dumps({'success':False,'scenes':scenes,'api':api,'errors':failures},indent=2),encoding='utf-8')
        raise
    finally:
        server.terminate()
        try: server.wait(timeout=8)
        except subprocess.TimeoutExpired: server.kill()
        log.close()

if __name__=='__main__': main()
