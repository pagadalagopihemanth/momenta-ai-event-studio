from datetime import date, timedelta
from .models import Event, Plan, BudgetRow, Vendor, Suggestions
from .budget import distribute
from .timeline import timeline

CATEGORIES = ['Venue','Catering','Decorations','Photography','Entertainment','Invitations','Transportation','Accommodation','Contingency']
WEIGHTS = {'Wedding':[22,30,12,12,5,3,4,4,8], 'Birthday':[20,30,16,8,10,3,2,1,10], 'Community event':[25,22,6,5,16,3,8,5,10]}

def ideas(event: Event) -> Suggestions:
    wedding = event.kind == 'Wedding'
    birthday = event.kind == 'Birthday'
    concept = 'family storytelling and a ceremony run sheet' if wedding else 'age-appropriate games and a quiet corner' if birthday else 'lightning talks, a hands-on AI workshop and networking circles'
    return Suggestions(overview=f'{event.name}: a {event.duration}-hour {event.kind.lower()} in {event.city} for {event.guests} guests, built around {event.theme}. Preferences to confirm: {event.preferences or "ask guests about dietary and access needs"}. Must-haves: {event.must_have or "agree with hosts"}. Optional: {event.optional or "keep flexible"}.', themes=[f'{event.theme} with reusable local decor',f'An intimate {event.city} gathering with warm lighting'], activities=[concept,'Build a timed programme with breaks and an accessible seating area'], food=[f'Confirm {event.preferences or "vegetarian, vegan and allergy-safe"} options directly with the caterer','For a Telugu menu: consider pulihora, pappu, vegetable curry, rice, sambar, curd and payasam; confirm regional preferences and allergens'], logistics=[f'Plan check-in, water and seating for {event.guests} people at {event.location}','Confirm accessible entry, toilets, transport and emergency contacts'], risks=['Outdoor weather: reserve a covered fallback and communicate the move decision','Vendor cancellation: agree written terms and keep a backup shortlist','Food allergies: label dishes and discuss cross-contamination with the caterer'], next_actions=['Confirm the venue capacity and written quotation','Agree priorities before committing deposits','Collect dietary, accessibility and RSVP information'], ideas=[f'{event.theme} invitation with a digital RSVP and a {event.city} travel note','Reusable floral or fabric decor; avoid single-use plastics',f'Guest experience: {concept}','Photography: candid guest stories and a shared consent-aware photo album','Return gifts: locally sourced seed kits or useful reusable items'])

def create_plan(event: Event) -> Plan:
    values = distribute(event.budget,WEIGHTS[event.kind])
    return Plan(event=event,budget=[BudgetRow(category=c,allocated=v,planned=v) for c,v in zip(CATEGORIES,values)],tasks=timeline(event),vendors=[Vendor(category=c,estimated=v,priority='High' if c in event.priorities or c in ['Venue','Catering'] else 'Medium',notes='Illustrative allowance; request actual quotes.') for c,v in zip(CATEGORIES,values) if c!='Contingency'],suggestions=ideas(event))

def demo(index: int) -> Plan:
    kind, name, guests, budget, theme = [('Wedding','Ananya & Arjun · A new beginning',300,900000,'Traditional South Indian'),('Birthday','A little more magic',40,50000,'Modern garden party'),('Community event','Bengaluru AI Collective',150,150000,'AI developer community')][index]
    return create_plan(Event(name=name,kind=kind,date=date.today()+timedelta(days=120),city='Bengaluru',budget=budget*100,guests=guests,theme=theme,preferences='Vegetarian; confirm allergies',priorities=['Catering','Photography'],illustrative=True))

def critique(plan: Plan) -> list[str]:
    findings=[]
    if sum(r.planned for r in plan.budget)>plan.event.budget: findings.append('Planned spending exceeds available funds.')
    if sum(r.actual for r in plan.budget)>plan.event.budget: findings.append('Actual spending exceeds available funds.')
    if (plan.event.date-date.today()).days<30: findings.append('Short lead time: contact essential vendors today; simplify scope.')
    if any(t.due<date.today() and not t.done for t in plan.tasks): findings.append('Overdue tasks need rescheduling or completion.')
    for category in ['Venue','Catering','Transportation']:
        if not any(v.category==category for v in plan.vendors): findings.append(f'Missing {category} vendor requirement.')
    if any(v.status!='Booked' for v in plan.vendors): findings.append('Unconfirmed vendors: verify availability, capacity, scope and written quotes.')
    if plan.event.must_have: findings.append('Review must-have requirements against vendor scopes; feasibility is not independently verified.')
    if any(not t.done for t in plan.tasks): findings.append('Complete pending tasks and resolve dependencies before marking the event ready.')
    preferences=plan.event.preferences.lower()
    if 'vegan' in preferences and any(word in plan.event.must_have.lower() for word in ['paneer','curd','dairy']): findings.append('Potential conflict: vegan preferences and dairy must-haves. Agree separate menus with the host.')
    if 'outdoor' in plan.event.location.lower(): findings.append('Outdoor location: verify a covered backup, permits, power protection and accessible evacuation routes.')
    return findings or ['Core checks passed. Confirm safety, contracts and guest needs with responsible people.']
