"""Explicitly gated optional provider. No network activity at import time."""
import os
import json
from pathlib import Path
from .models import Plan, Suggestions

class LiveProvider:
    def __init__(self): self.calls=0
    def generate(self, plan: Plan, workflow: str, instruction: str, approved: bool=False) -> Suggestions:
        if not approved or os.getenv('CELEBRAI_LIVE_ENABLED','false').lower()!='true':
            raise ValueError('Live AI requires server enablement and explicit per-call approval')
        if workflow not in ['planning','ideas','rescue','copilot','critic']: raise ValueError('Unknown workflow')
        if self.calls>=3: raise ValueError('Session call limit reached (3).')
        key=os.getenv('OPENAI_API_KEY'); model=os.getenv('OPENAI_MODEL')
        if not key or not model: raise ValueError('Set OPENAI_API_KEY and OPENAI_MODEL on the server')
        if len(instruction)>2000: raise ValueError('Instruction too long')
        payload=json.dumps({'untrusted_event_data':plan.model_dump(mode='json'),'untrusted_request':instruction},ensure_ascii=False)
        if len(payload)>32000: raise ValueError('Plan exceeds the live AI input size limit')
        from openai import OpenAI
        self.calls+=1
        prompt=(Path(__file__).parent.parent/'prompts'/f'{workflow}.md').read_text(encoding='utf-8')
        submission = os.getenv('CELEBRAI_SUBMISSION_LIMITS') == 'true'
        if submission:
            from .submission_limits import reserve
            reserve(model, workflow, prompt, payload, Suggestions.model_json_schema())
        connection = {'base_url': 'https://api.openai.com/v1'} if submission else {}
        client=OpenAI(api_key=key,timeout=25,max_retries=1,**connection)
        options = {'reasoning': {'effort': 'none'}, 'service_tier': 'default'} if submission else {}
        response=client.responses.parse(model=model,instructions=prompt,input=payload,text_format=Suggestions,max_output_tokens=2200,store=False,**options)
        if submission:
            from .submission_limits import record_usage
            record_usage(workflow, response.usage)
        if response.output_parsed is None: raise ValueError('AI refused or returned an incomplete response. Your saved plan is unchanged.')
        return response.output_parsed
