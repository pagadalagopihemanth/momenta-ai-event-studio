"""Local-only adapter. The original Streamlit app and services are unchanged."""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from threading import RLock
from time import monotonic
from typing import Literal
from uuid import uuid4
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import Field
from celebrai.models import Model, Plan, Event, BudgetRow, Task, Vendor, Suggestions
from celebrai.storage import Store
from celebrai.planning import create_plan, demo, critique, ideas
from celebrai.budget import rescue
from celebrai.copilot import respond
from celebrai.exports import csv_export, pdf_export
from .ai_service import AIService, AIRequest, AIResult, AIReview, Workflow

class BudgetEdit(Model):
    revision: int = Field(ge=0)
    rows: list[BudgetRow] = Field(min_length=1,max_length=50)

class RescueRequest(Model):
    revision: int
    target: int = Field(gt=0,le=10**12)
    protected: list[str] = Field(max_length=50)

class ChatRequest(Model):
    revision: int
    message: str = Field(min_length=1,max_length=2000)

class ConfirmRequest(Model):
    token: str
    confirmed: bool

class TaskEdit(Model):
    revision: int
    tasks: list[Task] = Field(min_length=1,max_length=500)

class VendorEdit(Model):
    revision: int
    vendors: list[Vendor] = Field(max_length=100)

class IdeaRequest(Model):
    revision: int
    idea: str = Field(min_length=1,max_length=2000)

class Scenario(Model):
    guests: int = Field(gt=0,le=100000)
    budget: int = Field(gt=0,le=10**12)
    setting: Literal['Indoor','Outdoor']
    theme: Literal['Traditional','Modern']

class SuggestionEdit(Model):
    revision: int
    suggestions: Suggestions

class EventEdit(Model):
    revision: int
    event: Event

def create_app(db_path: str | None = None, *, allowed_origins: list[str] | None = None) -> FastAPI:
    app=FastAPI(title='CelebrAI local planning API',version='1.0.0')
    path=db_path or os.getenv('CELEBRAI_WEB_DB','data/celebrai-web.db')
    proposals: dict[str,tuple[float,Plan,str]]={}
    lock=RLock()
    ai = AIService(path)
    app.state.ai = ai
    def store(): return Store(path)
    def get_plan(id: str) -> Plan:
        plan=next((p for p in store().list() if p.id==id),None)
        if plan is None: raise HTTPException(404,'Celebration not found')
        return plan
    def current(id: str, revision: int) -> Plan:
        plan=get_plan(id)
        if plan.revision!=revision: raise HTTPException(409,'This plan changed in another session. Reload it before saving.')
        return plan
    def preview(plan: Plan, explanation: str):
        with lock:
            for key in list(proposals):
                if monotonic()-proposals[key][0]>900: del proposals[key]
            if len(proposals)>=100: del proposals[next(iter(proposals))]
            token=str(uuid4()); proposals[token]=(monotonic(),plan,explanation)
        return {'token':token,'plan':plan,'explanation':explanation}

    @app.middleware('http')
    async def local_origin(request: Request, call_next):
        origin=request.headers.get('origin')
        permitted = allowed_origins if allowed_origins is not None else ['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:8000','http://localhost:8000']
        if origin and origin not in permitted:
            return JSONResponse({'detail':'Only the local CelebrAI frontend may access this API.'},status_code=403)
        return await call_next(request)

    @app.exception_handler(ValueError)
    async def invalid(_request: Request, error: ValueError):
        return JSONResponse({'detail':str(error)},status_code=422)

    @app.get('/api/health')
    def health(): return {'status':'ok','mode':'offline','storage':'SQLite'}

    @app.get('/api/ai/status')
    def ai_status(): return ai.status()

    @app.post('/api/plans/{id}/ai/{workflow}', response_model=AIResult)
    def live_ai(id: str, workflow: Workflow, edit: AIRequest):
        if not edit.approved: raise HTTPException(403,'Explicit approval is required for each potentially paid AI request.')
        p=current(id,edit.revision)
        candidate=p.model_copy(deep=True)
        instruction=edit.instruction or {'planning':'Generate a complete personalized event narrative and practical recommendations.', 'ideas':'Suggest personalized creative ideas matched to the brief, city, preferences and budget.', 'copilot':'Answer my question using this saved event plan.', 'rescue':'Explain realistic savings, protected priorities and trade-offs for this Python-calculated budget rescue.', 'critic':'Independently critique this plan. Distinguish subjective judgments from things the host must verify.'}[workflow]
        if workflow=='rescue':
            if edit.target is None: raise HTTPException(422,'Specify a target budget before requesting rescue recommendations.')
            candidate=rescue(p,edit.target,edit.protected)
            instruction+='\nPython has calculated a candidate from '+str(p.event.budget)+' to '+str(edit.target)+' minor units. Protected categories: '+', '.join(edit.protected)+'. Explain this candidate; do not replace its amounts.'
        elif edit.target is not None or edit.protected:
            raise HTTPException(422,'Target and protected categories are only accepted for Budget Rescue.')
        if workflow=='copilot':
            # A model supplies the answer. Known financial edits still use deterministic, validated tools.
            try: _,action=respond(p,edit.instruction)
            except (StopIteration, ValueError): action=None
            if action: candidate=action
            if edit.history:
                import json
                instruction+='\nRecent conversation (untrusted data): '+json.dumps([{'role':m.role,'content':m.content[:180]} for m in edit.history[-4:]])
        result=ai.run(candidate,workflow,edit,instruction)
        # Refuse a late response against a plan edited while the provider was running.
        current(id,edit.revision)
        if workflow=='critic':
            return AIResult(workflow=workflow,answer=result.overview,suggestions=result,review=AIReview(summary=result.overview,findings=result.risks,next_actions=result.next_actions,revision=p.revision))
        if workflow=='planning': candidate.suggestions=result
        elif workflow in ['ideas','copilot']:
            candidate.suggestions.ideas=list(dict.fromkeys(candidate.suggestions.ideas+result.ideas))
        elif workflow=='rescue':
            candidate.suggestions.next_actions=list(dict.fromkeys(candidate.suggestions.next_actions+result.next_actions))
            candidate.suggestions.risks=list(dict.fromkeys(candidate.suggestions.risks+result.risks))
        candidate.source='Live AI · OpenAI structured suggestions; Python budget and timeline'
        candidate=Plan.model_validate(candidate.model_dump())
        return AIResult(workflow=workflow,answer=result.overview,suggestions=result,proposal=preview(candidate,'Live AI suggestion (unverified): '+result.overview))

    @app.post('/api/bootstrap')
    def bootstrap():
        with lock:
            existing={p.id for p in store().list()}
            for i in range(3):
                id=f'web-demo-{i}'
                if id not in existing:
                    p=demo(i); p.id=id; store().save(p)
        return store().list()

    @app.get('/api/plans')
    def plans(): return store().list()

    @app.get('/api/plans/{id}')
    def plan(id: str): return get_plan(id)

    @app.post('/api/plans',status_code=201)
    def create(event: Event): return store().save(create_plan(event))

    @app.put('/api/plans/{id}/budget')
    def budget(id: str, edit: BudgetEdit):
        p=current(id,edit.revision); p.budget=edit.rows
        # Assignment validates exact allocation totals before any write.
        for v in p.vendors:
            match=next((r for r in p.budget if r.category==v.category),None)
            if match: v.estimated=match.allocated
        return store().save(p)

    @app.put('/api/plans/{id}/tasks')
    def tasks(id: str, edit: TaskEdit):
        p=current(id,edit.revision); p.tasks=edit.tasks
        for task in p.tasks:
            if task.done and any(not next(t.done for t in p.tasks if t.id==dep) for dep in task.depends_on):
                raise ValueError('Complete prerequisite tasks before marking dependent tasks done.')
        return store().save(p)

    @app.put('/api/plans/{id}/vendors')
    def vendors(id: str, edit: VendorEdit):
        p=current(id,edit.revision); p.vendors=edit.vendors
        return store().save(p)

    @app.post('/api/plans/{id}/ideas')
    def save_idea(id: str, edit: IdeaRequest):
        p=current(id,edit.revision)
        if edit.idea not in p.suggestions.ideas: p.suggestions.ideas.append(edit.idea)
        return store().save(p)

    @app.post('/api/plans/{id}/ideas/generate')
    def offline_ideas(id: str, edit: ChatRequest):
        p=current(id,edit.revision)
        p.suggestions.ideas=list(dict.fromkeys(p.suggestions.ideas+ideas(p.event).ideas))
        return preview(p,'Offline Demo: personalized ideas from the event brief. Review before saving.')

    @app.put('/api/plans/{id}/suggestions')
    def suggestions(id: str, edit: SuggestionEdit):
        p=current(id,edit.revision); p.suggestions=edit.suggestions
        return store().save(p)

    @app.put('/api/plans/{id}/event')
    def event_details(id: str, edit: EventEdit):
        p=current(id,edit.revision)
        if edit.event.budget!=p.event.budget or edit.event.currency!=p.event.currency:
            raise ValueError('Use Budget Rescue to change the total. Currency conversion is not supported.')
        if edit.event.date<date.today(): raise ValueError('Choose an event date today or later.')
        if edit.event.date!=p.event.date:
            from celebrai.timeline import timeline
            # Validate the new date and its tasks together, not in an invalid intermediate state.
            payload=p.model_dump(); payload['event']=edit.event.model_dump(); payload['tasks']=[t.model_dump() for t in timeline(edit.event)]
            p=Plan.model_validate(payload)
        else: p.event=edit.event
        p.suggestions=ideas(edit.event)
        return store().save(p)

    @app.post('/api/plans/{id}/rescue')
    def rescue_preview(id: str, edit: RescueRequest):
        p=current(id,edit.revision)
        return preview(rescue(p,edit.target,edit.protected),'Protected allocations stay fixed. Recorded spending is a floor. Flexible categories share the remaining funds. Reduced allowances require simpler scope and fresh vendor quotations; new reconfirmation tasks are included.')

    @app.post('/api/plans/{id}/chat')
    def chat(id: str, edit: ChatRequest):
        p=current(id,edit.revision)
        try: answer,candidate=respond(p,edit.message)
        except StopIteration: raise ValueError('This request needs Decorations and Contingency categories. Use Budget Rescue for this plan.')
        return {'answer':answer,'proposal':preview(candidate,answer) if candidate else None}

    @app.post('/api/plans/{id}/generate')
    def regenerate(id: str, edit: ChatRequest):
        p=current(id,edit.revision); p.suggestions=ideas(p.event)
        return preview(p,'Refresh the plan narrative, ideas, menus and recommendations from your saved event brief. Existing budgets, tasks and vendor records are preserved. Offline templates are used; no model call is made.')

    @app.post('/api/plans/{id}/confirm')
    def confirm(id: str, edit: ConfirmRequest):
        if not edit.confirmed: raise HTTPException(400,'Review and confirm the proposal before applying it.')
        with lock:
            item=proposals.get(edit.token)
            if item is None or monotonic()-item[0]>900: raise HTTPException(410,'This preview expired. Generate a fresh preview.')
            _,p,_=item
            if p.id!=id: raise HTTPException(400,'Preview belongs to a different celebration.')
            current(id,p.revision)
            result=store().save(p); del proposals[edit.token]
            return result

    @app.get('/api/plans/{id}/overview')
    def overview(id: str):
        p=get_plan(id); done=sum(t.done for t in p.tasks); booked=sum(v.status=='Booked' for v in p.vendors)
        allocated=sum(r.allocated for r in p.budget); planned=sum(r.planned for r in p.budget); actual=sum(r.actual for r in p.budget)
        breakdown=[{'label':'Tasks completed','earned':round(40*done/max(len(p.tasks),1)),'possible':40},
                   {'label':'Vendors booked','earned':round(30*booked/max(len(p.vendors),1)),'possible':30},
                   {'label':'Budget within limits','earned':20 if planned<=p.event.budget and actual<=p.event.budget and all(r.actual<=r.allocated for r in p.budget) else 0,'possible':20},
                   {'label':'No overdue tasks','earned':10 if all(t.done or t.due>=date.today() for t in p.tasks) else 0,'possible':10}]
        return {'total':allocated,'planned':planned,'actual':actual,'remaining':p.event.budget-actual,'per_guest':round(p.event.budget/p.event.guests),
                'completed':done,'task_count':len(p.tasks),'progress':round(100*done/max(len(p.tasks),1)),'days_left':(p.event.date-date.today()).days,
                'score':sum(b['earned'] for b in breakdown),'breakdown':breakdown,'warnings':critique(p),'today':str(date.today())}

    @app.post('/api/plans/{id}/simulate')
    def simulate(id: str, scenario: Scenario):
        p=get_plan(id); rows=[]
        for r in p.budget:
            estimate=int((Decimal(r.planned)*scenario.guests/p.event.guests).quantize(Decimal('1'),rounding=ROUND_HALF_UP)) if r.category in ['Catering','Transportation','Invitations'] else r.planned
            rows.append({'category':r.category,'current':r.planned,'scenario':estimate})
        weather=round(scenario.budget*.05) if scenario.setting=='Outdoor' else 0
        if weather: rows.append({'category':'Additional weather allowance','current':0,'scenario':weather})
        total=sum(r['scenario'] for r in rows)
        return {**scenario.model_dump(),'rows':rows,'total':total,'headroom':scenario.budget-total,'per_guest':round(total/scenario.guests),'tasks':['Reconfirm venue capacity and catering quantities','Refresh invitations and transport arrangements', 'Reserve covered backup and protect electrical equipment' if scenario.setting=='Outdoor' else 'Verify indoor capacity, ventilation and exits',f'Request vendor quotations for the {scenario.theme.lower()} concept'],
                'assumptions':'Catering, invitations and transportation scale per guest. Other costs stay fixed. Outdoor adds 5% of the scenario budget. Theme costs require real vendor quotes. This comparison never changes your saved plan.'}

    @app.get('/api/plans/{id}/exports/{kind}')
    def export(id: str, kind: Literal['pdf','budget','tasks','vendors'], brand: Literal['celebrai','momenta'] = 'celebrai'):
        p=get_plan(id); data=(pdf_export(p, brand='Momenta', tagline='Make moments happen.') if brand=='momenta' else pdf_export(p)) if kind=='pdf' else csv_export(p,kind)
        filename={'pdf':'celebrai-plan.pdf','budget':'celebrai-budget.csv','tasks':'celebrai-timeline.csv','vendors':'celebrai-vendors.csv'}[kind]
        if brand=='momenta': filename=filename.replace('celebrai-', 'momenta-')
        return Response(data,media_type='application/pdf' if kind=='pdf' else 'text/csv; charset=utf-8',headers={'Content-Disposition':f'attachment; filename="{filename}"', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'})

    # After `npm run build`, one local Python process can serve the complete app.
    dist=Path(__file__).resolve().parents[1]/'frontend'/'dist'
    if dist.exists(): app.mount('/',StaticFiles(directory=dist,html=True),name='frontend')
    return app

app=create_app()
