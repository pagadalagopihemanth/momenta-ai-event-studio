import streamlit as st

def style():
    st.markdown('''<style>
    .block-container{padding-top:2rem;max-width:1400px}
    h1,h2,h3{letter-spacing:-.035em} h1{font-weight:800}
    [data-testid="stMetric"]{background:white;border:1px solid #e6dff5;border-radius:18px;padding:20px;box-shadow:0 5px 20px #36206406}
    [data-testid="stMetricValue"]{font-size:1.35rem;font-weight:650}
    [data-testid="stMetricLabel"]{font-size:.8rem}
    [data-testid="stMetricValue"]>div,[data-testid="stMetricLabel"] p{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere}
    @media(max-width:1100px){[data-testid="stHorizontalBlock"]:has([data-testid="stMetric"]){flex-wrap:wrap}[data-testid="stHorizontalBlock"]:has([data-testid="stMetric"])>[data-testid="stColumn"]{flex:1 1 40%;min-width:180px}}
    [data-testid="stSidebar"]{border-right:1px solid #e6dff5}
    .hero{background:linear-gradient(115deg,#292044,#6543a8);color:white;padding:32px 38px;border-radius:24px;margin:0 0 28px}
    .hero h1{color:white;margin:8px 0}.eyebrow{font-size:12px;letter-spacing:3px;color:#e3d1ff}
    .hero p{color:#eee3ff;font-size:17px}.stButton button{border-radius:10px}
    [data-testid="stTabs"]{margin-top:20px} .stDownloadButton button{border-radius:10px}
    </style>''',unsafe_allow_html=True)
    st.markdown('<div class="hero"><div class="eyebrow">A LITTLE LESS PLANNING. A LOT MORE JOY.</div><h1>CelebrAI ✦</h1><p>Plan smarter. Celebrate better.</p></div>',unsafe_allow_html=True)
