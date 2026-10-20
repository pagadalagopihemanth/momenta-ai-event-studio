from types import SimpleNamespace
from uuid import uuid4
import json
import pytest
pytest.importorskip('fastapi')
from fastapi.testclient import TestClient
from webapi.app import create_app
from celebrai.planning import demo

@pytest.fixture
def setup(tmp_path,monkeypatch):
    import openai
    for key,value in [('CELEBRAI_LIVE_ENABLED','true'),('OPENAI_API_KEY','server-secret-test'),('OPENAI_MODEL','mock-model')]: monkeypatch.setenv(key,value)
    calls=[]
    result=demo(0).suggestions.model_copy(deep=True)
    result.overview='Model-powered personalized response'
    result.ideas=['Model-personalized vegetarian Telugu celebration idea']
    def parse(**kwargs): calls.append(kwargs); return SimpleNamespace(output_parsed=result)
    monkeypatch.setattr(openai,'OpenAI',lambda **kwargs:SimpleNamespace(responses=SimpleNamespace(parse=parse)))
    path=str(tmp_path/'ai.db');app=create_app(path);client=TestClient(app)
    p=next(p for p in client.post('/api/bootstrap').json() if p['id']=='web-demo-0')
    return client,p,calls,app,path

def payload(p,**kwargs): return {'revision':p['revision'],'approved':True,'request_id':str(uuid4()),'instruction':'Personalize this saved event plan.',**kwargs}

@pytest.mark.parametrize('workflow',['planning','ideas','copilot','rescue','critic'])
def test_model_workflows_and_confirmation(setup,workflow):
    client,p,calls,_,_=setup;url=f'/api/plans/{p["id"]}'
    data=payload(p,**({'target':70000000,'protected':['Catering','Photography']} if workflow=='rescue' else {}))
    response=client.post(url+'/ai/'+workflow,json=data)
    assert response.status_code==200,response.text
    out=response.json();assert out['mode']=='live' and out['workflow']==workflow
    assert out['answer']=='Model-powered personalized response'
    assert len(calls)==1 and calls[0]['text_format'].__name__=='Suggestions'
    assert calls[0]['store'] is False and calls[0]['max_output_tokens']==2200
    assert client.get(url).json()==p
    if workflow=='critic':
        assert out['review']['subjective'] is True and out['proposal'] is None
        assert client.get(url+'/overview').json()['score']==30
    else:
        proposed=out['proposal']; assert proposed
        assert client.post(url+'/confirm',json={'token':proposed['token'],'confirmed':False}).status_code==400
        saved=client.post(url+'/confirm',json={'token':proposed['token'],'confirmed':True}).json()
        assert saved['source'].startswith('Live AI')
        assert saved['event']['budget']==(70000000 if workflow=='rescue' else p['event']['budget'])
        assert saved['tasks']==proposed['plan']['tasks']
        if workflow=='rescue':
            for category in ['Catering','Photography']:
                assert next(r['allocated'] for r in saved['budget'] if r['category']==category)==next(r['allocated'] for r in p['budget'] if r['category']==category)

def test_approval_configuration_validation_and_secret_redaction(setup,monkeypatch):
    client,p,calls,_,_=setup;url=f'/api/plans/{p["id"]}/ai/planning'
    assert client.post(url,json=payload(p,approved=False)).status_code==403
    assert client.post(url,json=payload(p,approved='true')).status_code==422
    assert client.post(url,json=payload(p,revision=99)).status_code==409
    monkeypatch.setenv('CELEBRAI_LIVE_ENABLED','false')
    assert client.post(url,json=payload(p)).status_code==503
    assert calls==[]
    assert 'server-secret-test' not in client.get('/api/ai/status').text

def test_duplicate_request_not_billed_twice_and_limit_survives_restart(setup,monkeypatch):
    client,p,calls,_,path=setup;monkeypatch.setenv('CELEBRAI_WEB_AI_DAILY_LIMIT','1')
    data=payload(p);url=f'/api/plans/{p["id"]}/ai/planning'
    assert client.post(url,json=data).status_code==200
    assert client.post(url,json=data).status_code==200
    assert len(calls)==1
    assert client.post(url,json={**data,'instruction':'Changed request'}).status_code==409
    assert client.post(url,json=payload(p)).status_code==429
    second=TestClient(create_app(path))
    assert second.get('/api/ai/status').json()['remaining']==0
    assert second.post(url,json=payload(p)).status_code==429
    assert len(calls)==1

def test_invalid_model_response_fails_closed(setup,monkeypatch):
    import openai
    client,p,_,_,_=setup
    monkeypatch.setattr(openai,'OpenAI',lambda **kw:SimpleNamespace(responses=SimpleNamespace(parse=lambda **kw:SimpleNamespace(output_parsed={'overview':'broken'}))))
    response=client.post(f'/api/plans/{p["id"]}/ai/planning',json=payload(p))
    assert response.status_code==502 and client.get(f'/api/plans/{p["id"]}').json()==p
    assert client.get('/api/ai/status').json()['remaining']==4

def test_sdk_errors_never_leak_secrets_and_no_silent_fallback(setup,monkeypatch):
    import openai
    client,p,_,_,_=setup
    def fail(**kw): raise RuntimeError('server-secret-test private SDK request metadata')
    monkeypatch.setattr(openai,'OpenAI',fail)
    response=client.post(f'/api/plans/{p["id"]}/ai/copilot',json=payload(p))
    assert response.status_code==502 and 'server-secret-test' not in response.text
    assert client.get(f'/api/plans/{p["id"]}').json()==p

def test_history_contacts_and_numeric_copilot(setup):
    client,p,calls,_,_=setup;url=f'/api/plans/{p["id"]}'
    p['vendors'][0]['contact']='private-contact@example.test'
    p=client.put(url+'/vendors',json={'revision':p['revision'],'vendors':p['vendors']}).json()
    out=client.post(url+'/ai/copilot',json=payload(p,instruction='Reduce my decoration budget by 20%.',history=[{'role':'user','content':'My preference is reusable floral decor.'}])).json()
    assert out['proposal']
    assert 'private-contact@example.test' not in calls[0]['input']
    assert 'reusable floral decor' in calls[0]['input']
    assert out['proposal']['plan']['event']['budget']==p['event']['budget']
    assert 'untrusted' in calls[0]['instructions']

def test_invalid_rescue_never_calls_model(setup):
    client,p,calls,_,_=setup
    response=client.post(f'/api/plans/{p["id"]}/ai/rescue',json=payload(p,target=100,protected=['Catering']))
    assert response.status_code==422 and calls==[]

def test_export_headers_and_contents(setup):
    import csv,io
    client,p,_,_,_=setup
    expected={'pdf':'celebrai-plan.pdf','budget':'celebrai-budget.csv','tasks':'celebrai-timeline.csv','vendors':'celebrai-vendors.csv'}
    for kind,filename in expected.items():
        r=client.get(f'/api/plans/{p["id"]}/exports/{kind}')
        assert r.status_code==200
        assert r.headers['content-disposition']==f'attachment; filename="{filename}"'
        assert r.headers['cache-control']=='no-store' and r.headers['x-content-type-options']=='nosniff'
        assert int(r.headers['content-length'])==len(r.content)
        if kind=='pdf':
            assert r.headers['content-type']=='application/pdf' and r.content.startswith(b'%PDF-') and b'%%EOF' in r.content
        else:
            assert r.headers['content-type']=='text/csv; charset=utf-8'
            rows=list(csv.DictReader(io.StringIO(r.content.decode('utf-8-sig'))))
            assert len(rows)==len(p['budget' if kind=='budget' else kind])
    assert client.get('/api/plans/missing/exports/pdf').status_code==404
