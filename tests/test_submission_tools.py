"""Submission tooling must preserve paid-call and rehearsal safeguards."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]

def run_script(name,*args):
    return subprocess.run([sys.executable,str(ROOT/'scripts'/name),*args],cwd=ROOT,capture_output=True,text=True,timeout=15)

def test_live_recorder_cannot_run_without_explicit_paid_flag():
    result=run_script('record_submission.py','--live')
    assert result.returncode==2
    assert 'requires separate explicit approval' in result.stderr

def test_quick_recording_cannot_be_promoted_to_final_video(tmp_path):
    (tmp_path/'recording.json').write_text(json.dumps({'success':True,'quick':True}))
    result=run_script('produce_video.py','--run',str(tmp_path))
    assert result.returncode!=0
    assert 'not a short dry run' in result.stderr

def test_failed_recording_cannot_be_promoted(tmp_path):
    (tmp_path/'recording.json').write_text(json.dumps({'success':False,'quick':False}))
    result=run_script('produce_video.py','--run',str(tmp_path))
    assert result.returncode!=0
    assert 'successful full recording' in result.stderr

def test_source_scanner_detects_tokens_without_printing_them():
    spec=importlib.util.spec_from_file_location('audit',ROOT/'scripts'/'audit_submission.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    artificial=('sk-'+'x'*35).encode()
    result=module.scan(artificial,'example.py')
    assert result==[{'file':'example.py','rule':'openai_like'}]
    assert artificial.decode() not in json.dumps(result)
    assert module.scan(b'OPENAI_API_KEY=<server secret>','example.env')==[]
