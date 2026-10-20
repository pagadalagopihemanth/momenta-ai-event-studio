from types import SimpleNamespace
import pytest
from celebrai.submission_limits import connect, reserve, record_usage


@pytest.fixture(autouse=True)
def ledger(monkeypatch, tmp_path):
    monkeypatch.setenv('CELEBRAI_SUBMISSION_LEDGER', str(tmp_path/'allowance.db'))


def test_reserves_retries_and_prevents_repeat_across_connections():
    total = sum(reserve('gpt-6-luna', w, 'prompt', 'input', {}) for w in ('planning','rescue'))
    assert 0 < total < .10
    with pytest.raises(ValueError, match='already attempted'):
        reserve('gpt-6-luna','planning','prompt','input',{})
    record_usage('planning',SimpleNamespace(input_tokens=8000, output_tokens=2200))
    with connect() as db:
        assert db.execute("SELECT estimated_usd FROM allowance WHERE workflow='planning'").fetchone()[0] == pytest.approx(.0019)


def test_rejects_unknown_rates_workflows_and_oversized_input():
    for model, workflow in [('other','planning'),('gpt-6-luna','ideas')]:
        with pytest.raises(ValueError): reserve(model,workflow,'','',{})
    with pytest.raises(ValueError, match='token allowance'):
        reserve('gpt-6-luna','planning','','x'*100000,{})


def test_stops_when_prior_reservation_exhausts_allowance():
    with connect() as db:
        db.execute('INSERT INTO allowance VALUES (?,?,NULL,NULL,NULL)',('planning',.10))
    with pytest.raises(ValueError, match='exceeds'):
        reserve('gpt-6-luna','rescue','','',{})


def test_provider_submission_limits_and_usage_with_mock(monkeypatch):
    import openai
    from celebrai.ai import LiveProvider
    from celebrai.planning import demo
    plan = demo(0)
    captured = {}
    def parse(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(output_parsed=plan.suggestions,
                               usage=SimpleNamespace(input_tokens=8000, output_tokens=2200))
    def client(**kwargs):
        assert kwargs['base_url'] == 'https://api.openai.com/v1'
        assert kwargs['max_retries'] == 1
        return SimpleNamespace(responses=SimpleNamespace(parse=parse))
    monkeypatch.setattr(openai,'OpenAI',client)
    for key, value in [('CELEBRAI_SUBMISSION_LIMITS','true'),('CELEBRAI_LIVE_ENABLED','true'),
                       ('OPENAI_MODEL','gpt-6-luna'),('OPENAI_API_KEY','fake')]:
        monkeypatch.setenv(key,value)
    assert LiveProvider().generate(plan,'planning','Personalize this wedding',True) == plan.suggestions
    assert captured['reasoning'] == {'effort':'none'}
    assert captured['service_tier'] == 'default'
    assert captured['max_output_tokens'] == 2200
    with pytest.raises(ValueError,match='already attempted'):
        LiveProvider().generate(plan,'planning','Repeated request',True)
