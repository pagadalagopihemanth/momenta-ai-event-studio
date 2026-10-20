from datetime import date, timedelta
from .models import Event, Task

def timeline(event: Event, today: date | None = None) -> list[Task]:
    today = today or date.today()
    if event.date < today: raise ValueError('Choose an event date today or later')
    stages = [('Confirm scope and budget',120),('Shortlist venue and key vendors',90),('Book vendors and review contracts',60),('Send invitations and accessibility questions',45),('Confirm menu and dietary needs',21),('Close RSVPs and arrange transport',14),('Confirm weather backup and safety plan',7),('Reconfirm vendors and event run sheet',2),('Host celebration and reconcile expenses',0)]
    return [Task(id=f't{i}', title=title, due=max(today,event.date-timedelta(days=days)), priority='High' if i in (0,1,2,6) else 'Medium', depends_on=[f't{i-1}'] if i else [], notes='Compressed schedule: act promptly.' if (event.date-today).days < days else '') for i,(title,days) in enumerate(stages)]
