import pytest
pytest.importorskip('fastapi', reason='Install requirements-web.txt to run the optional React API integration tests')
from fastapi.testclient import TestClient
from webapi.app import create_app

@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(str(tmp_path/'web.db'))) as client:
        yield client

def test_vertical_slice(client):
    plans=client.post('/api/bootstrap').json()
    assert len(plans)==3
    assert len(client.post('/api/bootstrap').json())==3
    p=plans[0]; url=f'/api/plans/{p["id"]}'
    assert client.get(url).json()==p
    assert client.get(url+'/overview').json()['total']==p['event']['budget']
    rows=p['budget']; rows[0]['actual']=12000; rows[0]['allocated']-=10000; rows[1]['allocated']+=10000
    result=client.put(url+'/budget',json={'revision':p['revision'],'rows':rows})
    assert result.status_code==200
    saved=result.json()
    assert saved['budget'][0]['actual']==12000
    assert client.get(url).json()==saved
    assert client.put(url+'/budget',json={'revision':p['revision'],'rows':rows}).status_code==409
    rows[0]['allocated']+=1
    assert client.put(url+'/budget',json={'revision':saved['revision'],'rows':rows}).status_code==422

def test_origin_and_missing(client):
    assert client.post('/api/bootstrap',headers={'origin':'https://evil.example'}).status_code==403
    assert client.get('/api/plans/absent').status_code==404

def seed(client):
    return next(p for p in client.post('/api/bootstrap').json() if p['id']=='web-demo-0')

def test_rescue_preview_confirm_and_replay(client):
    p=seed(client); url=f'/api/plans/{p["id"]}'
    q=client.post(url+'/rescue',json={'revision':p['revision'],'target':70000000,'protected':['Catering','Photography']}).json()
    assert client.get(url).json()['event']['budget']==90000000
    assert sum(r['allocated'] for r in q['plan']['budget'])==70000000
    assert client.post(url+'/confirm',json={'token':q['token'],'confirmed':False}).status_code==400
    applied=client.post(url+'/confirm',json={'token':q['token'],'confirmed':True})
    assert applied.status_code==200
    assert applied.json()['event']['budget']==70000000
    assert client.get(url).json()==applied.json()
    assert client.post(url+'/confirm',json={'token':q['token'],'confirmed':True}).status_code==410

def test_stale_and_cross_event_proposals(client):
    p=seed(client); url=f'/api/plans/{p["id"]}'
    q=client.post(url+'/rescue',json={'revision':p['revision'],'target':70000000,'protected':[]}).json()
    assert client.post('/api/plans/web-demo-1/confirm',json={'token':q['token'],'confirmed':True}).status_code==400
    client.put(url+'/budget',json={'revision':p['revision'],'rows':p['budget']})
    assert client.post(url+'/confirm',json={'token':q['token'],'confirmed':True}).status_code==409

def test_tasks_dependencies_and_vendor_update(client):
    p=seed(client); url=f'/api/plans/{p["id"]}'
    tasks=p['tasks']; tasks[1]['done']=True
    assert client.put(url+'/tasks',json={'revision':p['revision'],'tasks':tasks}).status_code==422
    tasks[0]['done']=True
    p=client.put(url+'/tasks',json={'revision':p['revision'],'tasks':tasks}).json()
    vendors=p['vendors']; vendors[0]['status']='Booked';vendors[0]['contact']='Host-provided contact'
    p=client.put(url+'/vendors',json={'revision':p['revision'],'vendors':vendors}).json()
    assert p['vendors'][0]['status']=='Booked'
    assert client.get(url+'/overview').json()['completed']==2

@pytest.mark.parametrize('message',['Reduce my decoration budget by 20%.','Create a backup plan for outdoor rain.','What tasks are still pending?'])
def test_chat_and_generate_no_silent_write(client,message):
    p=seed(client); url=f'/api/plans/{p["id"]}'
    result=client.post(url+'/chat',json={'revision':p['revision'],'message':message})
    assert result.status_code==200 and result.json()['answer']
    assert client.get(url).json()==p
    assert client.post(url+'/generate',json={'revision':p['revision'],'message':'test'}).status_code==200
    assert client.get(url).json()==p

def test_simulation_and_exports(client):
    p=seed(client); url=f'/api/plans/{p["id"]}'
    scenario=client.post(url+'/simulate',json={'guests':350,'budget':90000000,'setting':'Outdoor','theme':'Modern'}).json()
    assert scenario['headroom']==90000000-scenario['total']
    assert scenario['total']==sum(r['scenario'] for r in scenario['rows'])
    assert scenario['rows'][-1]['scenario']==4500000
    assert client.get(url).json()==p
    assert client.get(url+'/exports/pdf').content.startswith(b'%PDF')
    for section in ['budget','tasks','vendors']:
        response=client.get(url+'/exports/'+section)
        assert response.status_code==200 and len(response.content)>100
    assert client.get(url+'/exports/invalid').status_code==422

def test_inspiration_suggestions_and_creation(client):
    p=seed(client); url=f'/api/plans/{p["id"]}'
    p=client.post(url+'/ideas',json={'revision':p['revision'],'idea':'Reusable local florals'}).json()
    assert p['suggestions']['ideas'][-1]=='Reusable local florals'
    p['suggestions']['overview']='Edited by the planner'
    p=client.put(url+'/suggestions',json={'revision':p['revision'],'suggestions':p['suggestions']}).json()
    assert p['suggestions']['overview']=='Edited by the planner'
    p['event']['name']='A new celebration'
    created=client.post('/api/plans',json=p['event'])
    assert created.status_code==201 and created.json()['id']!=p['id']

def test_event_brief_validates_budget_and_rebuilds_dates(client):
    from datetime import date,timedelta
    p=seed(client); url=f'/api/plans/{p["id"]}'
    event={**p['event'],'date':str(date.today()+timedelta(days=14)),'name':'Updated brief'}
    response=client.put(url+'/event',json={'revision':p['revision'],'event':event})
    assert response.status_code==200
    assert all(t['due']<=event['date'] for t in response.json()['tasks'])
    event['budget']-=1
    assert client.put(url+'/event',json={'revision':response.json()['revision'],'event':event}).status_code==422

def test_momenta_export_brand_is_opt_in_and_legacy_exports_remain(client):
    from io import BytesIO, StringIO
    import csv
    from pypdf import PdfReader
    p=seed(client)
    root=f'/api/plans/{p["id"]}/exports/'
    for kind,name in [('pdf','plan.pdf'),('budget','budget.csv'),('tasks','timeline.csv'),('vendors','vendors.csv')]:
        result=client.get(root+kind+'?brand=momenta')
        assert result.status_code==200
        assert result.headers['content-disposition']==f'attachment; filename="momenta-{name}"'
        assert result.headers['cache-control']=='no-store'
        if kind=='pdf':
            pdf=PdfReader(BytesIO(result.content))
            text='\n'.join(page.extract_text() for page in pdf.pages)
            assert 'Momenta | Make moments happen.' in text
            assert pdf.metadata.author=='Momenta'
            assert ' '.join(p['event']['name'].replace('\u00b7', ' / ').split()) in ' '.join(text.split())
        else:
            assert len(list(csv.DictReader(StringIO(result.content.decode('utf-8-sig')))))==len(p['budget' if kind=='budget' else kind])
    legacy=PdfReader(BytesIO(client.get(root+'pdf').content))
    assert legacy.metadata.author=='CelebrAI'
    assert 'CelebrAI | Plan smarter. Celebrate better.' in legacy.pages[0].extract_text()
    assert client.get(root+'pdf?brand=unknown').status_code==422
