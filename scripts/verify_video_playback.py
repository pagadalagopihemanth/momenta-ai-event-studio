"""Verify the real MP4 in Chromium, including seeking and advancing playback."""
import json
import os
from pathlib import Path
import tempfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SUB=ROOT/'submission'
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(Path(tempfile.gettempdir())/'MomentaPlaywright'))

def main():
    report=json.loads((SUB/'video-verification.json').read_text())
    run=Path(json.loads((SUB/'latest-recording.json').read_text())['run'])
    player=run/'player.html'
    player.write_text(f'''<!doctype html><meta charset="utf-8"><title>Momenta video QA</title>
    <style>body{{margin:0;background:#111318}}video{{width:100vw;height:100vh;object-fit:contain}}</style>
    <video id="demo" controls muted src="../../{report['file']}"></video>''',encoding='utf-8')
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':1920,'height':1080})
        page.goto(player.as_uri())
        page.wait_for_function('document.querySelector("video").readyState>=2')
        meta=page.locator('video').evaluate('(v)=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,error:v.error?.code||null})')
        assert 209<=meta['duration']<240 and meta['width']==1920 and meta['height']==1080 and meta['error'] is None
        page.locator('video').evaluate('(v)=>{v.currentTime=150;return v.play()}')
        page.wait_for_function('document.querySelector("video").currentTime>151')
        page.locator('video').evaluate('(v)=>v.pause()')
        page.screenshot(path=str(SUB/'video-playback.png'))
        browser.close()
    report['browser_playback_passed']=True
    report['browser_video_metadata']=meta
    (SUB/'video-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({'browser_playback_passed':True,**meta}))

if __name__=='__main__':main()
