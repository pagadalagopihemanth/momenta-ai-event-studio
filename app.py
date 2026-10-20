from datetime import date, timedelta
import logging
import pandas as pd
import plotly.express as px
import streamlit as st
from celebrai.models import Event, Plan, BudgetRow, Task, Vendor
from celebrai.planning import create_plan, demo, critique
from celebrai.budget import money, minor, rescue
from celebrai.storage import Store
from celebrai.copilot import respond
from celebrai.exports import csv_export,pdf_export
from celebrai.ai import LiveProvider
from celebrai.ui import style

st.set_page_config(page_title='CelebrAI · Your celebration studio',page_icon='✦',layout='wide')
style()
store=Store()
if 'provider' not in st.session_state: st.session_state.provider=LiveProvider()
def persist(p):
    st.session_state.plan=store.save(p)
    st.session_state.pop('proposal',None)
    st.success('Plan saved to your celebration studio.')
def proposal(p, explanation):
    st.session_state.proposal=(p,explanation,st.session_state.plan.revision)

with st.sidebar:
    st.markdown('## ✦ Your celebration studio')
    page=st.radio('Workspace',['Dashboard','Create event','Guided demo'],label_visibility='collapsed')
    saved=store.list()
    if saved:
        selected=st.selectbox('Saved celebrations',[p.id for p in saved],format_func=lambda id:next(p.event.name for p in saved if p.id==id))
        if st.button('Open celebration',width='stretch'):
            st.session_state.plan=next(p for p in saved if p.id==selected); st.session_state.pop('proposal',None); st.rerun()
    st.divider(); st.caption('OFFLINE FIRST · PRIVATE LOCAL STORAGE')
    st.caption('Illustrative allowances, not vendor quotations. Live AI is optional and requires explicit approval.')

if page=='Create event':
    st.header('Make room for something wonderful')
    st.caption('Three steps to a practical, personal celebration plan.')
    if 'wizard' not in st.session_state: st.session_state.wizard=0
    if 'draft' not in st.session_state: st.session_state.draft={}
    step=st.session_state.wizard; d=st.session_state.draft
    st.progress((step+1)/3,text=['01 · The occasion','02 · The experience','03 · Review & create'][step])
    with st.form('event_wizard_form'):
        if step==0:
            a,b=st.columns(2)
            with a:
                name=st.text_input('Event name',d.get('name','Our next celebration'))
                kind=st.selectbox('Event type',['Wedding','Birthday','Community event'],index=['Wedding','Birthday','Community event'].index(d.get('kind','Wedding')))
                when=st.date_input('Event date',d.get('date',date.today()+timedelta(days=120)),min_value=date.today())
            with b:
                city=st.text_input('City',d.get('city','Bengaluru'))
                location=st.text_input('Location / venue',d.get('location','Venue to be decided'))
                guests=st.number_input('Expected guests',1,100000,d.get('guests',300))
            budget=st.number_input('Total budget (major currency units)',min_value=1.0,value=float(d.get('budget',900000)))
            currency=st.selectbox('Currency',['INR','USD','EUR','GBP'],index=['INR','USD','EUR','GBP'].index(d.get('currency','INR')))
            duration=st.number_input('Duration in hours',1,168,d.get('duration',6))
        elif step==1:
            theme=st.text_input('Preferred theme',d.get('theme','Traditional South Indian'))
            preferences=st.text_area('Cultural, dietary and accessibility preferences',d.get('preferences',''))
            must=st.text_area('Must-have requirements',d.get('must_have',''))
            optional=st.text_area('Optional requirements',d.get('optional',''))
            priorities=st.multiselect('Planning priorities',['Venue','Catering','Decorations','Photography','Entertainment','Transportation','Accommodation'],default=d.get('priorities',['Catering','Photography']))
        else: st.json(d)
        back=st.form_submit_button('Back') if step else False
        forward=st.form_submit_button('Create & save plan' if step==2 else 'Continue',type='primary')
        if back: st.session_state.wizard-=1; st.rerun()
        if forward:
            try:
                if step==0:
                    if not name.strip() or not city.strip(): raise ValueError('Enter an event name and city')
                    d.update(name=name,kind=kind,date=when,city=city,location=location,guests=guests,budget=budget,currency=currency,duration=duration)
                if step==1: d.update(theme=theme,preferences=preferences,must_have=must,optional=optional,priorities=priorities)
                if step<2: st.session_state.wizard+=1; st.rerun()
                else:
                    payload={**d,'budget':minor(d['budget'])}; persist(create_plan(Event(**payload))); st.session_state.wizard=0
                    st.success('Your event is ready. Open Dashboard in the sidebar.')
            except ValueError as e: st.error(str(e))
    st.stop()

if page=='Guided demo':
    st.header('From first idea to celebration day')
    st.caption('Every scenario is illustrative, works offline and can be edited after loading.')
    for i,(title,detail) in enumerate([('South Indian Wedding','300 guests · Bengaluru · ₹9,00,000'),('Birthday Celebration','40 guests · Bengaluru · ₹50,000'),('Community Technology Meetup','150 attendees · Bengaluru · ₹1,50,000')]):
        with st.container(border=True):
            st.subheader(title); st.write(detail)
            if st.button('Start this demo',key=f'demo{i}'):
                persist(demo(i)); st.success('Demo loaded. Select Dashboard to explore.')
    st.info('Demo path: load a scenario → inspect the budget → preview a rescue → apply it → complete tasks → compare a what-if → review readiness → download your plan.')
    st.stop()

if 'plan' not in st.session_state:
    st.session_state.plan=demo(0)
p=st.session_state.plan
fmt=lambda amount:money(amount,p.event.currency)
st.caption(('ILLUSTRATIVE DEMO · ' if p.event.illustrative else '')+p.source)
st.header(p.event.name)
st.write(f'{p.event.kind} · {p.event.date:%d %b %Y} · {p.event.city} · {p.event.guests} guests')
a,b,c,d=st.columns(4)
a.metric('Celebration budget',fmt(p.event.budget)); b.metric('Planned spending',fmt(sum(r.planned for r in p.budget))); c.metric('Remaining after actuals',fmt(p.event.budget-sum(r.actual for r in p.budget))); d.metric('Budget per guest',fmt(round(p.event.budget/p.event.guests)))
if sum(r.planned for r in p.budget)>p.event.budget or any(r.actual>r.allocated for r in p.budget): st.warning('Overspending detected. Review planned or actual spending against allocations.')
if (p.event.date-date.today()).days<30: st.warning('Close to the event: the schedule is compressed. Prioritize essential bookings now.')
if 'proposal' in st.session_state:
    candidate, explanation, revision=st.session_state.proposal
    with st.container(border=True):
        st.subheader('Review proposed changes'); st.write(explanation)
        st.write(f'Total budget: {fmt(p.event.budget)} → {fmt(candidate.event.budget)}')
        st.dataframe(pd.DataFrame([{'Category':r.category,'Before':fmt(old.allocated),'After':fmt(r.allocated),'Change':fmt(r.allocated-old.allocated)} for old,r in zip(p.budget,candidate.budget)]),hide_index=True,width='stretch')
        st.write('New tasks:',[t.title for t in candidate.tasks if t.id not in {x.id for x in p.tasks}])
        if candidate.suggestions!=p.suggestions: st.json(candidate.suggestions.model_dump())
        confirm=st.checkbox('I reviewed the changes and confirm saving this proposal')
        left,right=st.columns(2)
        if left.button('Apply changes',disabled=not confirm,type='primary'):
            try:
                if revision!=p.revision: raise ValueError('Proposal is stale. Generate a fresh preview.')
                persist(candidate); st.rerun()
            except ValueError as e: st.error(str(e))
        if right.button('Discard proposal'): st.session_state.pop('proposal'); st.rerun()

tabs=st.tabs(['Overview','Budget','Timeline','Vendors','Ideas','Rescue & Copilot','What-if','Review & Export'])
with tabs[0]:
    left,right=st.columns([1.5,1])
    with left:
        st.subheader('A celebration that feels like you'); st.write(p.suggestions.overview)
        for section in ['themes','activities','food','logistics','risks','next_actions']:
            with st.expander(section.replace('_',' ').title(),expanded=section=='next_actions'):
                for idea in getattr(p.suggestions,section): st.write('• '+idea)
    with right:
        done=sum(t.done for t in p.tasks); st.subheader('Your planning pulse'); st.progress(done/len(p.tasks),text=f'{done} of {len(p.tasks)} tasks complete')
        st.plotly_chart(px.pie(names=[r.category for r in p.budget],values=[r.allocated/100 for r in p.budget],hole=.7,color_discrete_sequence=px.colors.sequential.Purples_r),width='stretch')
    with st.expander('Edit event details'):
        with st.form('details'):
            name=st.text_input('Name',p.event.name); guests=st.number_input('Guests',1,100000,p.event.guests)
            when=st.date_input('Date',p.event.date,min_value=date.today())
            theme=st.text_input('Theme',p.event.theme); prefs=st.text_area('Preferences',p.event.preferences)
            if st.form_submit_button('Preview details update'):
                from celebrai.timeline import timeline
                from celebrai.planning import ideas
                q=p.model_copy(deep=True); q.event.name=name; q.event.guests=guests; q.event.date=when; q.event.theme=theme; q.event.preferences=prefs
                if when!=p.event.date: q.tasks=timeline(q.event)
                q.suggestions=ideas(q.event)
                proposal(Plan.model_validate(q.model_dump()),f'Update name, guests, date, theme and preferences. Date changes rebuild the timeline; suggestions refresh. Guests: {p.event.guests} → {guests}; date: {p.event.date} → {when}.'); st.rerun()
with tabs[1]:
    st.subheader('Give every detail its place')
    st.caption('Amounts are in major currency units. Allocations must equal the total budget; planned spending may exceed it and triggers an alert. Add categories using the last row.')
    rows=pd.DataFrame([{**r.model_dump(),'allocated':r.allocated/100,'planned':r.planned/100,'actual':r.actual/100} for r in p.budget])
    edited=st.data_editor(rows,num_rows='dynamic',hide_index=True,width='stretch',key=f'budget-{p.id}-{p.revision}')
    if st.button('Save budget edits'):
        try:
            q=p.model_copy(deep=True); q.budget=[BudgetRow(category=str(r['category']),**{k:minor(r[k]) for k in ['allocated','planned','actual']}) for r in edited.to_dict('records')]; persist(q); st.rerun()
        except (ValueError,TypeError) as e: st.error(str(e))
    chart=rows.melt('category',var_name='Amount',value_name='Value')
    st.plotly_chart(px.bar(chart,x='category',y='Value',color='Amount',barmode='group',color_discrete_sequence=['#7452d6','#b49be9','#38304d']),width='stretch')
with tabs[2]:
    st.subheader('Small steps. A remarkable day.')
    st.caption('Dependencies must be complete before a task can be marked done. Overdue tasks are flagged below.')
    for t in p.tasks:
        if not t.done and t.due<date.today(): st.warning(f'Overdue: {t.title} ({t.due})')
    data=pd.DataFrame([t.model_dump() for t in p.tasks]); data['depends_on']=data.depends_on.map(lambda x:', '.join(x))
    edited=st.data_editor(data,disabled=['id','depends_on'],hide_index=True,width='stretch',key=f'tasks-{p.id}-{p.revision}')
    if st.button('Save timeline'):
        try:
            q=p.model_copy(deep=True); records=edited.to_dict('records')
            for r in records: r['depends_on']=[x.strip() for x in r['depends_on'].split(',') if x.strip()]
            q.tasks=[Task(**r) for r in records]
            for t in q.tasks:
                if t.done and any(not next(x.done for x in q.tasks if x.id==dep) for dep in t.depends_on): raise ValueError('Complete prerequisite tasks first')
            persist(q); st.rerun()
        except ValueError as e: st.error(str(e))
with tabs[3]:
    st.subheader('Your people behind the scenes')
    st.caption('No businesses or quotations are invented. Add contacts only when you have verified them. Estimated amounts use major currency units.')
    rows=pd.DataFrame([{**v.model_dump(),'estimated':v.estimated/100} for v in p.vendors])
    edited=st.data_editor(rows,num_rows='dynamic',hide_index=True,width='stretch',key=f'vendors-{p.id}-{p.revision}',column_config={'status':st.column_config.SelectboxColumn(options=['Research','Contacted','Shortlisted','Booked']),'priority':st.column_config.SelectboxColumn(options=['High','Medium','Low'])})
    if st.button('Save vendor checklist'):
        try:
            q=p.model_copy(deep=True); q.vendors=[Vendor(**{**r,'estimated':minor(r['estimated'])}) for r in edited.to_dict('records')]; persist(q); st.rerun()
        except (ValueError,TypeError) as e: st.error(str(e))
with tabs[4]:
    st.subheader('Make it memorable')
    for i,idea in enumerate(p.suggestions.ideas):
        with st.container(border=True): st.markdown(f'**0{i+1} · A personal touch**'); st.write(idea)
    st.caption('These are suggestions. Confirm cultural fit, age suitability, availability and cost with your hosts and vendors.')
with tabs[5]:
    st.subheader('A change of plans can still be a beautiful plan')
    target=st.number_input('Revised total budget',min_value=1.0,value=p.event.budget/100)
    protected=st.multiselect('Protect these allocations',[r.category for r in p.budget],default=[r.category for r in p.budget if r.category in p.event.priorities])
    if st.button('Preview budget rescue',type='primary'):
        try: proposal(rescue(p,minor(target),protected),'Protected allocations stay fixed. Recorded actual spending is a floor. Flexible categories share the remaining funds proportionally. Renegotiate reduced scopes before committing.'); st.rerun()
        except ValueError as e: st.error(str(e))
    st.divider(); st.subheader('Your planning copilot')
    for role,content in st.session_state.get('chat',[]):
        with st.chat_message(role): st.write(content)
    message=st.chat_input('Try: Reduce my decoration budget by 20%')
    if message:
        try:
            answer,candidate=respond(p,message)
            st.session_state.setdefault('chat',[]).extend([('user',message),('assistant',answer)])
            if candidate: proposal(candidate,answer)
            st.rerun()
        except ValueError as e: st.error(str(e))
    with st.expander('Optional live AI · explicit paid-call approval required'):
        st.caption('Uses the OpenAI API, billed separately from ChatGPT. Requires server environment variables. Maximum 3 requests per session, 2,200 output tokens per request, one retry. No live calls were made during development.')
        workflow=st.selectbox('AI workflow',['planning','ideas','rescue','copilot','critic'])
        instruction=st.text_area('Ask for personalized suggestions',max_chars=2000)
        approved=st.checkbox('I approve one potentially paid API request, including at most one retry. My plan will be sent to OpenAI.')
        if st.button('Request live suggestions',disabled=not approved):
            try:
                with st.spinner('Preparing validated suggestions…'):
                    result=st.session_state.provider.generate(p,workflow,instruction,approved)
                q=p.model_copy(deep=True); q.suggestions=result; q.source='OpenAI suggestions · unverified; Python budget and timeline'
                proposal(q,'AI suggestions only. Review them below. Financial changes must use Budget Rescue.'); st.rerun()
            except Exception:
                logging.getLogger('celebrai').warning('Live generation failed; saved plan unchanged')
                st.error('Live AI unavailable or invalid output. Check enablement, model, key and call limit. Offline planning remains available.')
with tabs[6]:
    st.subheader('Explore the possibilities')
    left,right=st.columns(2)
    guests=left.number_input('Scenario guests',1,100000,p.event.guests)
    amount=right.number_input('Scenario budget',min_value=1.0,value=p.event.budget/100)
    setting=left.selectbox('Setting',['Indoor','Outdoor'])
    theme=right.selectbox('Scenario theme',['Traditional','Modern'])
    scenario_budget=minor(amount)
    st.dataframe(pd.DataFrame({'Metric':['Guests','Total budget','Budget per guest','Setting','Theme'],'Current':[str(p.event.guests),fmt(p.event.budget),fmt(round(p.event.budget/p.event.guests)),p.event.location,p.event.theme],'Scenario':[str(guests),fmt(scenario_budget),fmt(round(scenario_budget/guests)),setting,theme]}),hide_index=True,width='stretch')
    from celebrai.budget import distribute
    baseline=[r.planned for r in p.budget]
    projected=[round(r.planned*guests/p.event.guests) if r.category in ['Catering','Invitations','Transportation'] else r.planned for r in p.budget]
    if setting=='Outdoor':
        reserve=next((i for i,r in enumerate(p.budget) if r.category=='Contingency'),0)
        projected[reserve]+=round(scenario_budget*.05)
    st.dataframe(pd.DataFrame({'Category':[r.category for r in p.budget],'Current planned':[fmt(v) for v in baseline],'Scenario estimate':[fmt(v) for v in projected],'Difference':[fmt(v-o) for v,o in zip(projected,baseline)]}),hide_index=True,width='stretch')
    st.info(f'Projected spending: {fmt(sum(projected))}; scenario headroom: {fmt(scenario_budget-sum(projected))}. Assumptions: catering, invitations and transport scale per guest; other costs stay fixed. Outdoor adds a 5% weather allowance. Theme effects require vendor quotes.')
    st.write('Affected tasks: reconfirm venue capacity, refresh catering quantities, update invitations and transport. '+('Reserve covered backup and check power protection.' if setting=='Outdoor' else 'Confirm indoor capacity, ventilation and exits.')+f' Ask decorators to quote the {theme.lower()} concept. This simulation does not change your saved plan.')
with tabs[7]:
    st.subheader('A thoughtful final check')
    st.caption('Deterministic readiness checks; recommendations do not certify safety or vendor readiness. Optional AI Critic is a subjective review.')
    for finding in critique(p): st.warning(finding)
    st.divider(); st.subheader('Take your plan with you')
    st.download_button('Download complete plan · PDF',pdf_export(p),'celebrai-plan.pdf','application/pdf')
    for section,label in [('budget','Budget'),('vendors','Vendor checklist'),('tasks','Timeline')]: st.download_button(f'{label} · CSV',csv_export(p,section),f'celebrai-{section}.csv','text/csv')
    if st.button('Save this celebration',type='primary'):
        try: persist(p); st.rerun()
        except ValueError as e: st.error(str(e))

