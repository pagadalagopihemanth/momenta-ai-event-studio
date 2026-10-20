import re
from .models import Plan, Task
from .budget import minor, rescue

def respond(plan: Plan, message: str) -> tuple[str, Plan | None]:
    text=message.lower().replace(',', '')
    if len(message)>2000: raise ValueError('Keep requests below 2,000 characters')
    if 'pending' in text:
        return '\n'.join(f'- {t.title} · {t.due}' for t in plan.tasks if not t.done) or 'All tasks completed.',None
    if 'budget' in text and any(w in text for w in ['lakh','₹',' rupees',' to ','dropped']):
        matches=re.findall(r'(\d+(?:\.\d+)?)\s*(lakh|lakhs|k|thousand)?',text)
        if matches:
            value,unit=matches[-1]
            target=minor(float(value)*({'lakh':100000,'lakhs':100000,'k':1000,'thousand':1000}.get(unit,1)))
            protected=[r.category for r in plan.budget if r.category.lower() in text and any(w in text for w in ['keep','protect','priorit'])]
            return 'Proposed reallocation. Reduced categories need simpler scope or fresh quotations. Review the comparison before applying.',rescue(plan,target,protected)
    if ('decoration' in text or 'decor' in text) and '%' in text:
        match=re.search(r'(\d+(?:\.\d+)?)\s*%',text)
        if not match: return 'Specify a percentage reduction.',None
        percent=float(match[1])
        if not 0<=percent<=100: raise ValueError('Reduction must be between 0 and 100%')
        p=plan.model_copy(deep=True)
        row=next(r for r in p.budget if r.category=='Decorations')
        reduction=round(row.allocated*percent/100)
        if row.allocated-reduction<row.actual: raise ValueError('Reduction would fall below recorded decoration spending')
        row.allocated-=reduction; row.planned=min(row.planned,row.allocated)
        next(r for r in p.budget if r.category=='Contingency').allocated+=reduction
        for v in p.vendors:
            if v.category=='Decorations': v.estimated=row.allocated
        p.tasks.append(Task(id=f'decor-{len(p.tasks)}',title='Renegotiate decoration scope after reduction',due=min(__import__('datetime').date.today(),p.event.date),priority='High'))
        return 'Savings move to contingency. Simplify installations and use reusable decor.',Plan.model_validate(p.model_dump())
    if 'more guests' in text or 'invite' in text:
        match=re.search(r'(\d+)',text)
        if match:
            extra=int(match[1]); catering=next(r for r in plan.budget if r.category=='Catering')
            return f'{extra} more guests increase catering needs by approximately {extra*catering.planned/plan.event.guests/100:,.2f} {plan.event.currency} at the current allowance per guest. Use What-if to compare capacity, catering and transport before committing.',None
    p=plan.model_copy(deep=True)
    if 'rain' in text or 'outdoor' in text:
        idea='Reserve a covered venue, protect electrical equipment, check accessible dry routes, and agree a weather decision time with vendors.'
    elif 'kid' in text:
        idea='Add supervised age-appropriate games, allergy-aware snacks, a quiet zone and named child pickup contacts.'
    elif 'telugu' in text or 'menu' in text:
        idea='Discuss pulihora, pappu, seasonal curry, rice, sambar, curd and payasam with the caterer; confirm Telugu regional traditions, dietary preferences and allergen handling.'
    else:
        return 'Offline copilot supports budget targets, decoration percentage cuts, pending tasks, extra guests, kid-friendly ideas, Telugu menus and rain backups. For open-ended suggestions use optional live AI.',None
    p.suggestions.ideas.append(idea)
    return idea,p
