from streamlit.testing.v1 import AppTest

def test_dashboard_smoke(tmp_path,monkeypatch):
    monkeypatch.setenv('CELEBRAI_DB',str(tmp_path/'ui.db'))
    at=AppTest.from_file(str(__import__('pathlib').Path(__file__).resolve().parents[1]/'app.py'),default_timeout=30).run()
    assert not at.exception
    assert len(at.tabs)==8
    next(b for b in at.button if b.label=='Preview budget rescue').click().run()
    assert not at.exception
    assert any('Review proposed changes' in h.value for h in at.subheader)
    next(b for b in at.button if b.label=='Discard proposal').click().run()
    assert not at.exception
    next(n for n in at.number_input if n.label=='Revised total budget').set_value(700000.0)
    next(b for b in at.button if b.label=='Preview budget rescue').click().run()
    assert next(b for b in at.button if b.label=='Apply changes').disabled
    next(c for c in at.checkbox if c.label=='I reviewed the changes and confirm saving this proposal').check().run()
    next(b for b in at.button if b.label=='Apply changes').click().run()
    assert not at.exception
    from celebrai.storage import Store
    saved=Store(str(tmp_path/'ui.db')).list()[0]
    assert saved.event.budget==70000000

def test_wizard_and_demo(tmp_path,monkeypatch):
    monkeypatch.setenv('CELEBRAI_DB',str(tmp_path/'ui.db'))
    at=AppTest.from_file(str(__import__('pathlib').Path(__file__).resolve().parents[1]/'app.py'),default_timeout=30).run()
    at.radio[0].set_value('Create event').run()
    next(b for b in at.button if b.label=='Continue').click().run()
    next(b for b in at.button if b.label=='Continue').click().run()
    next(b for b in at.button if b.label=='Create & save plan').click().run()
    assert not at.exception
    at.radio[0].set_value('Guided demo').run()
    next(b for b in at.button if b.label=='Start this demo').click().run()
    assert not at.exception
