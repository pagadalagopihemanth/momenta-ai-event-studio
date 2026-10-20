from decimal import Decimal, ROUND_HALF_UP
from .models import Plan

def minor(value) -> int:
    return int((Decimal(str(value)) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

def money(value: int, currency='INR') -> str:
    amount = f'{abs(value)/100:,.2f}'
    if currency == 'INR':
        whole, fraction = amount.replace(',', '').split('.')
        tail, head = whole[-3:], whole[:-3]
        groups = []
        while head:
            groups.insert(0, head[-2:]); head = head[:-2]
        amount = ','.join(groups + [tail]) + '.' + fraction
    return ('-' if value < 0 else '') + {'INR':'₹','USD':'$','EUR':'€','GBP':'£'}[currency] + amount

def distribute(total: int, weights: list[int]) -> list[int]:
    if total < 0 or not weights or sum(weights) <= 0:
        raise ValueError('Invalid allocation')
    denominator = sum(weights)
    result = [total*w//denominator for w in weights]
    order = sorted(range(len(weights)), key=lambda i: total*weights[i]%denominator, reverse=True)
    for i in order[:total-sum(result)]: result[i] += 1
    return result

def rescue(plan: Plan, target: int, protected: list[str]) -> Plan:
    if target <= 0: raise ValueError('Budget must be positive')
    unknown = set(protected) - {r.category for r in plan.budget}
    if unknown: raise ValueError('Unknown protected category')
    candidate = plan.model_copy(deep=True)
    floors = [max(r.actual, r.allocated if r.category in protected else 0) for r in plan.budget]
    if sum(floors) > target:
        raise ValueError('Protected allocations and recorded spending exceed the new budget. Increase it or unprotect a category.')
    flexible = [i for i,r in enumerate(plan.budget) if r.category not in protected]
    if not flexible and sum(floors) != target: raise ValueError('Unprotect at least one category')
    additions = distribute(target-sum(floors), [max(plan.budget[i].allocated-floors[i],1) for i in flexible]) if flexible else []
    for i,r in enumerate(candidate.budget):
        r.allocated = floors[i] + (additions[flexible.index(i)] if i in flexible else 0)
        r.planned = min(r.planned, r.allocated)
    candidate.event.budget = target
    for v in candidate.vendors:
        v.estimated = next((r.allocated for r in candidate.budget if r.category == v.category), v.estimated)
    for r, old in zip(candidate.budget, plan.budget):
        if r.allocated != old.allocated:
            from .models import Task
            candidate.tasks.append(Task(id=f'requote-{r.category}-{len(candidate.tasks)}', title=f'Reconfirm {r.category.lower()} scope and quotation', due=min(plan.event.date, __import__('datetime').date.today()), priority='High', notes=f'Allocation changed; agree scope before committing.'))
    return Plan.model_validate(candidate.model_dump())
