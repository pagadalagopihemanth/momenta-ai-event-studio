"""Scan intended source, staged contents and every reachable Git blob for secrets.

This is a focused heuristic scan, not a certification. Values are never printed.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT=Path(__file__).resolve().parents[1]
RULES={
 'openai_like':re.compile(rb'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}'),
 'github_like':re.compile(rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})'),
 'private_key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'assigned_secret':re.compile(rb'''(?im)^\s*(?:OPENAI_API_KEY|GITHUB_TOKEN|GH_TOKEN)\s*=\s*["']?([A-Za-z0-9_\-]{20,})'''),
}

def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT)
def scan(data,label):
    if b'\0' in data[:8000]: return []
    return [{'file':label,'rule':name} for name,pattern in RULES.items() if pattern.search(data)]

def main():
    names=git('ls-files','--cached','--others','--exclude-standard','-z').decode().split('\0')
    names=sorted(set(n for n in names if n and (ROOT/n).is_file() and n not in ['submission/source-audit.json','submission/source-manifest.json']))
    findings=[];manifest=[]
    forbidden=[]
    for name in names:
        if name.endswith(('.mp4','.webm','.db','.db-wal','.db-shm')) or name.startswith(('submission/private/','submission/raw/','.env/')) or name=='.env':forbidden.append(name)
        data=(ROOT/name).read_bytes();findings+=scan(data,name)
        manifest.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    staged=git('diff','--cached','--name-only','--diff-filter=ACMR','-z').decode().split('\0')
    for name in filter(None,staged): findings+=scan(git('show',f':{name}'),'staged:'+name)
    history=git('rev-list','--objects','--all').decode().splitlines()
    blobs=0
    for line in history:
        oid,_,name=line.partition(' ')
        if git('cat-file','-t',oid).strip()==b'blob':
            blobs+=1;findings+=scan(git('cat-file','blob',oid),'history:'+name)
    passed=not findings and not forbidden
    report={'heuristic_scan_passed':passed,'source_files':len(names),'staged_files':len(list(filter(None,staged))),
            'reachable_history_blobs':blobs,'findings':findings,'forbidden_public_files':forbidden,
            'limitations':'Pattern-based scan; binaries require visual inspection. Not a complete secret-detection guarantee.'}
    sub=ROOT/'submission';sub.mkdir(exist_ok=True)
    (sub/'source-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    if not passed:
        print(json.dumps(report,indent=2));raise SystemExit('Resolve findings before staging or publication.')
    # Source only. Media and private artifacts are excluded by Git ignore rules.
    package=sub/'Momenta_Source.zip'
    with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as archive:
        for entry in manifest:archive.write(ROOT/entry['path'],entry['path'])
    (sub/'source-manifest.json').write_text(json.dumps({'files':manifest,'archive':package.name,'archive_sha256':hashlib.sha256(package.read_bytes()).hexdigest()},indent=2),encoding='utf-8')
    print(json.dumps({**report,'source_archive':package.name,'archive_bytes':package.stat().st_size},indent=2))

if __name__=='__main__': main()
