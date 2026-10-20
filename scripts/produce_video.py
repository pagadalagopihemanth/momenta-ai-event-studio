"""Produce and verify a captioned 1080p MP4 from an actual browser recording."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import subprocess

ROOT=Path(__file__).resolve().parents[1]
SUB=ROOT/'submission'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--run',type=Path)
    args=parser.parse_args()
    run=args.run or Path(json.loads((SUB/'latest-recording.json').read_text())['run'])
    report=json.loads((run/'recording.json').read_text())
    if not report['success'] or report['quick']: raise SystemExit('Use a successful full recording, not a short dry run.')
    import imageio_ffmpeg
    from PIL import Image, ImageDraw, ImageFont
    live=report['mode']=='live'
    if live and report['paid_model_requests']!=2: raise SystemExit('Genuine live request evidence is incomplete.')
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    source=run/'capture.webm'
    probe=subprocess.run([ffmpeg,'-i',str(source)],capture_output=True,text=True).stderr
    match=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',probe)
    if not match: raise RuntimeError('Cannot inspect source duration')
    duration=int(match[1])*3600+int(match[2])*60+float(match[3])
    if duration>225: raise SystemExit(f'Recording is {duration:.2f}s. Re-record or manually edit; important interactions will not be sped up.')
    target=max(210,duration+1)
    if target>=240: raise SystemExit('Cannot produce a video under four minutes without manual editing.')
    output=SUB/('Momenta_PromptWars_Final.mp4' if live else 'Momenta_PromptWars_Rehearsal.mp4')
    badge='LIVE GENAI DEMONSTRATION' if live else 'OFFLINE REHEARSAL | NO MODEL CALLS | NOT FINAL SUBMISSION'
    (run/'badge.txt').write_text(badge,encoding='utf-8')
    font='C\\:/Windows/Fonts/segoeui.ttf'
    # Paths are relative filter inputs, so drive-colon escaping is unnecessary.
    stretch=max(1.0,min(1.3,target/duration))
    filters=[f'setpts={stretch:.8f}*PTS',f'tpad=stop_mode=clone:stop_duration={max(0,target-duration*stretch):.3f}',
             'fps=30','scale=1920:1080:flags=lanczos',
             'drawbox=x=0:y=0:w=iw:h=28:color=0x111318@0.98:t=fill',
             f"drawtext=fontfile='{font}':textfile='badge.txt':fontcolor=0x64E4C4:fontsize=16:x=(w-tw)/2:y=5",
             'drawbox=x=0:y=1020:w=iw:h=60:color=0x111318@0.97:t=fill']
    for i,scene in enumerate(report['scenes']):
        path=run/f'caption-{i:02}.txt';path.write_text(scene['caption'],encoding='utf-8')
        end=report['scenes'][i+1]['start']*stretch if i+1<len(report['scenes']) else target
        filters.append(f"drawtext=fontfile='{font}':textfile='{path.name}':fontcolor=0xF5F2EB:fontsize=24:x=(w-tw)/2:y=1037:enable='between(t,{scene['start']*stretch},{end})'")
    filters.extend(['fade=t=in:st=0:d=0.3',f'fade=t=out:st={target-.5}:d=0.5'])
    subprocess.run([ffmpeg,'-y','-i',str(source),'-vf',','.join(filters),'-t',str(target),'-an',
        '-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart',str(output)],cwd=run,check=True,stdout=subprocess.DEVNULL,stderr=(run/'encode.log').open('w'))
    metadata=subprocess.run([ffmpeg,'-i',str(output)],capture_output=True,text=True).stderr
    (run/'video-metadata.txt').write_text(metadata,encoding='utf-8')
    actual=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',metadata)
    actual_seconds=int(actual[1])*3600+int(actual[2])*60+float(actual[3])
    assert actual_seconds<240 and '1920x1080' in metadata and '30 fps' in metadata
    # Fully decode the deliverable to verify its MP4 bitstream, rather than trusting the extension.
    decoded=subprocess.run([ffmpeg,'-v','error','-i',str(output),'-f','null','-'],capture_output=True,text=True)
    assert decoded.returncode==0 and not decoded.stderr.strip(),decoded.stderr
    frames=SUB/'frames';frames.mkdir(exist_ok=True)
    times=[2,30,60,90,120,150,180,205]
    thumbs=[]
    for t in times:
        path=frames/f'frame-{t:03}.png'
        subprocess.run([ffmpeg,'-y','-ss',str(t),'-i',str(output),'-frames:v','1',str(path)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        im=Image.open(path);im.thumbnail((640,360));thumbs.append(im.copy())
    sheet=Image.new('RGB',(1280,4*390),'#111318');draw=ImageDraw.Draw(sheet)
    for i,im in enumerate(thumbs):
        x=(i%2)*640;y=(i//2)*390;sheet.paste(im,(x,y));draw.text((x+15,y+365),f'{times[i]} seconds',fill='white')
    sheet.save(SUB/'video-contact-sheet.jpg',quality=90)
    image=Image.open(run/'01-landing.png').convert('RGB')
    image=image.resize((1920,1080));d=ImageDraw.Draw(image)
    d.rectangle((0,0,1920,155),fill='#111318')
    font_title=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',64)
    font_small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',28)
    d.text((65,22),'Momenta | AI Event Studio',font=font_title,fill='#F5F2EB')
    d.text((68,107),'PromptWars Virtual | '+('LIVE DEMO' if live else 'OFFLINE REHEARSAL - LIVE AI PENDING'),font=font_small,fill='#64E4C4')
    image.save(SUB/'Momenta_Thumbnail.png')
    result={'file':output.name,'mode':report['mode'],'duration_seconds':actual_seconds,'width':1920,'height':1080,'fps':30,
            'full_decode_passed':True,'bytes':output.stat().st_size,'live_model_calls':report['paid_model_requests'],
            'source_seconds':duration,'playback_speed':round(1/stretch,4),'scenes':[s['name'] for s in report['scenes']],'audio':'Silent, explanatory captions',
            'final_submission_ready':live,'manual_frame_review_pending':True}
    (SUB/'video-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result,indent=2))

if __name__=='__main__': main()
