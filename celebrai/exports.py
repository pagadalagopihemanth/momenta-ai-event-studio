from io import BytesIO
from xml.sax.saxutils import escape
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from .models import Plan
from .budget import money

def csv_export(plan: Plan, section: str) -> bytes:
    if section not in ['budget','tasks','vendors']: raise ValueError('Unknown export section')
    rows=[r.model_dump(mode='json') for r in getattr(plan,section)]
    for row in rows:
        for key,value in row.items():
            if key in ['allocated','planned','actual','estimated']: row[key]=f'{value/100:.2f}'
            elif isinstance(value,list): row[key]='; '.join(map(str,value))
            elif isinstance(value,str) and value.lstrip().startswith(('=','+','-','@')): row[key]="'"+value
    return pd.DataFrame(rows).to_csv(index=False).encode('utf-8-sig')

def pdf_export(plan: Plan, *, brand: str = "CelebrAI", tagline: str = "Plan smarter. Celebrate better.") -> bytes:
    output=BytesIO(); styles=getSampleStyleSheet(); story=[]
    regular=Path('C:/Windows/Fonts/arial.ttf')
    bold=Path('C:/Windows/Fonts/arialbd.ttf')
    if regular.exists() and bold.exists():
        if 'CelebrAI' not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont('CelebrAI',str(regular)))
            pdfmetrics.registerFont(TTFont('CelebrAI-Bold',str(bold)))
        for name in ['BodyText','Title','Heading1','Heading2']:
            styles[name].fontName='CelebrAI' if name=='BodyText' else 'CelebrAI-Bold'
    def add(text, style='BodyText'):
        # Standard PDF fonts do not contain rupee glyph; use ISO currency labels.
        text=text.replace('₹','INR ').replace('•',' / ').replace('·',' / ')
        paragraph=Paragraph(escape(text),styles[style])
        gap=Spacer(1,7)
        gap.keepWithNext=style!='BodyText'
        if style=='BodyText' and len(story)>=2 and getattr(story[-1],'keepWithNext',False):
            prior_gap=story.pop(); heading=story.pop()
            story.append(KeepTogether([heading,prior_gap,paragraph,gap]))
        else:
            story.extend([paragraph,gap])
    add(f'{brand} | {tagline}','Title')
    add(plan.event.name,'Heading1'); add(f'{plan.event.date} | {plan.event.city} | {plan.event.guests} guests')
    add(f'Total budget: {money(plan.event.budget,plan.event.currency)} | Duration: {plan.event.duration} hours | Priorities: {", ".join(plan.event.priorities) or "To be agreed"}')
    add(plan.source); add(plan.suggestions.overview)
    add('Budget | '+plan.event.currency,'Heading2')
    data=[['Category','Allocated','Planned','Actual']]+[[r.category,*[money(getattr(r,k),plan.event.currency).replace('₹','INR ') for k in ['allocated','planned','actual']]] for r in plan.budget]
    from reportlab.lib.styles import ParagraphStyle
    cell=ParagraphStyle('BudgetCell',parent=styles['BodyText'],fontSize=8,leading=11,wordWrap='CJK')
    data=[[Paragraph(escape(str(value)),cell) for value in row] for row in data]
    table=Table(data,repeatRows=1,colWidths=[135,117,117,117],hAlign='LEFT'); table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DDEDE3' if brand == 'Momenta' else '#E8DFFA')),('BOTTOMPADDING',(0,0),(-1,-1),8)])); story.append(table)
    for section in ['themes','activities','food','logistics','risks','next_actions','ideas']:
        add(section.replace('_',' ').title(),'Heading2')
        for text in getattr(plan.suggestions,section): add(text)
    add('Timeline','Heading2')
    for t in plan.tasks: add(f'{t.due} | {"Done" if t.done else "Pending"} | {t.title} | {t.priority} | Depends on: {", ".join(t.depends_on) or "None"} | {t.notes}')
    add('Vendor checklist','Heading2')
    for v in plan.vendors: add(f'{v.category} | {v.status} | {money(v.estimated,plan.event.currency)} | {v.notes} | {v.contact}')
    def footer(canvas,document):
        canvas.setFont('Helvetica',8); canvas.setFillColor(colors.HexColor('#655879'))
        canvas.drawString(36,24,f'{brand} | Illustrative planning allowances; confirm with vendors')
        canvas.drawRightString(document.pagesize[0]-36,24,f'Page {document.page}')
    SimpleDocTemplate(output,title=f'{brand} event plan',author=brand,rightMargin=36,leftMargin=36).build(story,onFirstPage=footer,onLaterPages=footer)
    return output.getvalue()
