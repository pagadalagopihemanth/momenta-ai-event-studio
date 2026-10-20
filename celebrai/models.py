from datetime import date
from typing import Literal
from uuid import uuid4
from pydantic import BaseModel, Field, ConfigDict, model_validator

class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', validate_assignment=True)

class Event(Model):
    name: str = Field(min_length=1, max_length=120)
    kind: Literal['Wedding', 'Birthday', 'Community event']
    date: date
    city: str = Field(min_length=1, max_length=120)
    location: str = Field(default='Venue to be decided', max_length=300)
    budget: int = Field(gt=0, le=10**12, description='Minor currency units')
    currency: Literal['INR', 'USD', 'EUR', 'GBP'] = 'INR'
    guests: int = Field(gt=0, le=100000)
    duration: int = Field(default=6, ge=1, le=168)
    theme: str = Field(default='Traditional', max_length=300)
    preferences: str = Field(default='', max_length=2000)
    must_have: str = Field(default='', max_length=2000)
    optional: str = Field(default='', max_length=2000)
    priorities: list[str] = Field(default_factory=list)
    illustrative: bool = False

class BudgetRow(Model):
    category: str = Field(min_length=1, max_length=100)
    allocated: int = Field(ge=0)
    planned: int = Field(ge=0)
    actual: int = Field(default=0, ge=0)

class Task(Model):
    id: str
    title: str
    due: date
    priority: Literal['High', 'Medium', 'Low'] = 'Medium'
    done: bool = False
    depends_on: list[str] = Field(default_factory=list)
    notes: str = ''

class Vendor(Model):
    category: str
    estimated: int = Field(ge=0)
    status: Literal['Research', 'Contacted', 'Shortlisted', 'Booked'] = 'Research'
    priority: Literal['High', 'Medium', 'Low'] = 'Medium'
    notes: str = ''
    contact: str = ''

class Suggestions(Model):
    overview: str
    themes: list[str]
    activities: list[str]
    food: list[str]
    logistics: list[str]
    risks: list[str]
    next_actions: list[str]
    ideas: list[str]

class Plan(Model):
    id: str = Field(default_factory=lambda: str(uuid4()))
    revision: int = 0
    event: Event
    budget: list[BudgetRow]
    tasks: list[Task]
    vendors: list[Vendor]
    suggestions: Suggestions
    source: str = 'Offline • illustrative planning estimates'

    @model_validator(mode='after')
    def consistent(self):
        names = [r.category for r in self.budget]
        if len(names) != len(set(names)) or not names:
            raise ValueError('Budget categories must be unique and nonempty')
        if sum(r.allocated for r in self.budget) != self.event.budget:
            raise ValueError('Allocations must equal the event budget')
        ids = [t.id for t in self.tasks]
        if len(set(ids)) != len(ids):
            raise ValueError('Task IDs must be unique')
        seen = set()
        for t in self.tasks:
            if t.due > self.event.date or any(d not in seen for d in t.depends_on):
                raise ValueError('Invalid deadline or dependency ordering')
            if any(next(x.due for x in self.tasks if x.id == d) > t.due for d in t.depends_on):
                raise ValueError('Dependency due after dependent task')
            seen.add(t.id)
        return self
