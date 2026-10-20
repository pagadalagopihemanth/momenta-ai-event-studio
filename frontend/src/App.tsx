import { motion, MotionConfig, useReducedMotion } from "motion/react";
import { Landing } from "./components/Landing";
import { Wordmark } from "./components/Brand";
import { SectionHead, PanelHead } from "./components/layout";
import type { SaveFunction } from "./types";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Sparkles,
  LayoutDashboard,
  MessageSquareText,
  Images,
  Wallet,
  CalendarDays,
  Store,
  GitCompareArrows,
  ShieldCheck,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  Plus,
  MapPin,
  Users,
  Check,
  CheckCheck,
  Download,
  Leaf,
  Menu,
  X,
  LoaderCircle,
  TriangleAlert,
  RefreshCw,
  Heart,
  Clock3,
  CalendarCheck,
  Save,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Plan, Health, BudgetRow } from "./types";
import { request, money, dateLabel } from "./api";
import { Button, Badge, Modal } from "./components/ui";
import {
  EventForm,
  PlanningStudio,
  Inspiration,
  Rescue,
  ProposalReview,
  Timeline,
  Vendors,
  Simulator,
  Readiness,
} from "./experiences";
import type { Proposal } from "./types";
import { AIControls, useAI } from "./components/AIContext";
import { ExportButton } from "./components/ExportButton";
import { DemoGuide } from "./components/DemoGuide";

const navigation = [
  { id: "overview", label: "Command center", icon: LayoutDashboard },
  { id: "studio", label: "AI planning studio", icon: MessageSquareText },
  { id: "inspiration", label: "Inspiration board", icon: Images },
  { id: "budget", label: "Budget studio", icon: Wallet },
  { id: "timeline", label: "Timeline & tasks", icon: CalendarDays },
  { id: "vendors", label: "Vendor workspace", icon: Store },
  { id: "simulator", label: "What-if simulator", icon: GitCompareArrows },
  { id: "readiness", label: "Event readiness", icon: ShieldCheck },
];
const colors = [
  "#287D69",
  "#64E4C4",
  "#FFB86B",
  "#737B8C",
  "#B8CFC7",
  "#ABC0CD",
  "#C78C72",
  "#D5CBAC",
  "#E8E4DA",
];
export const photo = (p: Plan) =>
  p.event.kind === "Wedding"
    ? "/images/wedding.webp"
    : p.event.kind === "Birthday"
      ? "/images/birthday.webp"
      : "/images/meetup.webp";

export default function App() {
  const ai = useAI();
  const [home, setHome] = useState(window.location.hash !== "#studio");
  const [initialKind, setInitialKind] =
    useState<Plan["event"]["kind"]>("Wedding");
  function enterStudio() {
    setHome(false);
    window.history.replaceState(null, "", "#studio");
    window.scrollTo(0, 0);
  }
  function createOccasion(kind: Plan["event"]["kind"] = "Wedding") {
    setInitialKind(kind);
    setGuide(null);
    setCreator(true);
  }
  const [guide, setGuide] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]),
    [plan, setPlan] = useState<Plan | null>(null),
    [health, setHealth] = useState<Health | null>(null);
  const [page, setPage] = useState("overview"),
    [chooser, setChooser] = useState(false),
    [mobile, setMobile] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [creator, setCreator] = useState(false);
  const [editingBrief, setEditingBrief] = useState(false),
    [proposal, setProposal] = useState<Proposal | null>(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 721px)");
    const closeWideDrawer = () => {
      if (query.matches) setMobile(false);
    };
    query.addEventListener("change", closeWideDrawer);
    return () => query.removeEventListener("change", closeWideDrawer);
  }, []);
  useEffect(() => {
    if (mobile) document.getElementById("site-navigation")?.focus();
    else if (window.matchMedia("(max-width: 720px)").matches)
      document.getElementById("navigation-toggle")?.focus();
  }, [mobile]);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await request<Plan[]>("/bootstrap", "POST");
      setPlans(list);
      const id = localStorage.getItem("celebrai-event");
      setPlan(
        (current) =>
          current ||
          list.find((p) => p.id === id) ||
          list.find((p) => p.id === "web-demo-0") ||
          list[0],
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!plan) return;
    let alive = true;
    setHealth(null);
    localStorage.setItem("celebrai-event", plan.id);
    request<Health>(`/plans/${plan.id}/overview`)
      .then((h) => alive && setHealth(h))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [plan]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  function select(p: Plan) {
    enterStudio();
    setPlan(p);
    setChooser(false);
    setPage("overview");
    setError("");
    setMobile(false);
    setProposal(null);
  }
  function reviewPreview(q: Proposal) {
    setProposal(q);
    if (guide === 3) setGuide(4);
  }
  function navigate(id: string) {
    setPage(id);
    setMobile(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(path: string, body: unknown, method = "PUT") {
    setBusy(true);
    setError("");
    try {
      const p = await request<Plan>(path, method, body);
      setPlan((current) =>
        current?.id === p.id || path === "/plans" ? p : current,
      );
      setPlans((ps) => [p, ...ps.filter((x) => x.id !== p.id)]);
      setNotice("All set. Your changes are saved.");
      return p;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const current = navigation.find((n) => n.id === page)!;
  if (loading)
    return (
      <div className="boot">
        <div className="brand-mark">
          <Sparkles />
        </div>
        <h1>Make moments happen.</h1>
        <p>Opening Momenta · AI Event Studio…</p>
        <LoaderCircle className="spin" />
      </div>
    );
  if (!plan)
    return (
      <div className="boot">
        <TriangleAlert />
        <h1>Let’s reconnect.</h1>
        <p role="alert">
          {error || "Start the Python API to open your studio."}
        </p>
        <code>python -m uvicorn webapi.app:app --port 8000</code>
        <Button onClick={() => void load()}>
          <RefreshCw size={16} />
          Try again
        </Button>
      </div>
    );
  const p = plan;
  return (
    <MotionConfig reducedMotion="user">
      <div className={home ? "home-shell" : "app-shell"}>
        {home && (
          <Landing
            onEnter={enterStudio}
            onCreate={createOccasion}
            onDemo={() => {
              enterStudio();
              setGuide(0);
              navigate("overview");
            }}
          />
        )}
        <div className="studio-shell" hidden={home}>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          {mobile && (
            <button
              className="sidebar-scrim"
              aria-label="Close navigation"
              onClick={() => setMobile(false)}
            />
          )}
          <aside
            id="site-navigation"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setMobile(false);
                document.getElementById("navigation-toggle")?.focus();
              }
            }}
            className={"sidebar " + (mobile ? "open" : "")}
            aria-label="Main navigation"
          >
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setHome(true);
                window.history.replaceState(null, "", "#home");
                window.scrollTo(0, 0);
              }}
            >
              <Wordmark />
            </a>
            <p className="brand-tagline">AI Event Studio</p>
            <button
              className="event-selector"
              onClick={() => setChooser(true)}
              aria-label="Select celebration"
            >
              <span className="event-monogram">
                {p.event.kind === "Wedding" ? (
                  <Heart size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
              </span>
              <span>
                <small>YOUR CELEBRATION</small>
                <strong>{p.event.name.split(" · ")[0]}</strong>
              </span>
              <ChevronDown size={15} />
            </button>
            <span className="nav-label">THE PLANNING SPACE</span>
            <nav>
              {navigation.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={page === id ? "nav-item active" : "nav-item"}
                  onClick={() => navigate(id)}
                  aria-current={page === id ? "page" : undefined}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {id === "studio" && <span className="mini-ai">AI</span>}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="sidebar-note">
                <span className="little-star">✦</span>
                <h3>Big moments. Less overwhelm.</h3>
                <p>Your ideas, plans and people. Beautifully together.</p>
                <button onClick={() => navigate("studio")}>
                  Find your next step <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="local-status">
                <span className="status-dot" />
                Offline demo ready <Leaf size={14} />
              </div>
            </div>
          </aside>
          <div className="workspace" inert={mobile}>
            <header className="topbar">
              <div className="breadcrumbs">
                <button
                  className="icon-button mobile-menu"
                  id="navigation-toggle"
                  aria-controls="site-navigation"
                  aria-expanded={mobile}
                  aria-label="Open navigation"
                  onClick={() => setMobile(true)}
                >
                  <Menu size={21} />
                </button>
                <span>Your workspace</span>
                <span className="breadcrumb-slash">/</span>
                <strong>{current.label}</strong>
              </div>
              <div className="top-actions">
                <button
                  type="button"
                  className="text-link guided-demo-trigger"
                  onClick={() => {
                    setGuide(0);
                    navigate("overview");
                  }}
                >
                  2-minute demo
                </button>
                <AIControls />
                <span className="offline">
                  <span className="status-dot" />
                  {ai.mode === "live" ? "Server-side AI" : "Local & private"}
                </span>
                <button
                  className="avatar"
                  aria-label="Select your celebration"
                  onClick={() => setChooser(true)}
                >
                  M
                </button>
              </div>
            </header>
            <main id="main" tabIndex={-1}>
              <motion.div
                key={page + p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                {guide !== null && (
                  <DemoGuide
                    step={guide}
                    plan={p}
                    onCreate={() => setCreator(true)}
                    onNavigate={navigate}
                    onStep={setGuide}
                    onClose={() => setGuide(null)}
                  />
                )}
                <div className="plan-provenance">
                  <Badge
                    tone={p.source.startsWith("Live AI") ? "purple" : "sage"}
                  >
                    {p.source.startsWith("Live AI")
                      ? "Saved plan · Live AI suggestions"
                      : "Saved plan · Offline Demo"}
                  </Badge>
                  <span className="quiet">
                    Amounts and deadlines are validated in Python.
                  </span>
                </div>
                {error && (
                  <div className="alert error" role="alert">
                    <TriangleAlert size={18} />
                    <span>{error}</span>
                    <button
                      className="icon-button"
                      aria-label="Dismiss error"
                      onClick={() => setError("")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {page === "overview" && (
                  <Overview
                    plan={p}
                    health={health}
                    navigate={navigate}
                    onCreate={() => setCreator(true)}
                  />
                )}
                {page === "budget" && (
                  <Budget
                    key={p.id + "-" + p.revision}
                    plan={p}
                    busy={busy}
                    save={save}
                    onPreview={reviewPreview}
                  />
                )}
                {page === "studio" && (
                  <PlanningStudio
                    key={p.id}
                    plan={p}
                    busy={busy}
                    save={save}
                    onPreview={reviewPreview}
                    onEdit={() => setEditingBrief(true)}
                  />
                )}
                {page === "inspiration" && (
                  <Inspiration
                    key={p.id}
                    plan={p}
                    busy={busy}
                    save={save}
                    onPreview={reviewPreview}
                  />
                )}
                {page === "timeline" && (
                  <Timeline
                    key={p.id}
                    plan={p}
                    busy={busy}
                    save={save}
                    today={
                      health?.today || new Date().toLocaleDateString("en-CA")
                    }
                  />
                )}
                {page === "vendors" && (
                  <Vendors key={p.id} plan={p} busy={busy} save={save} />
                )}
                {page === "simulator" && (
                  <Simulator key={p.id + "-" + p.revision} plan={p} />
                )}
                {page === "readiness" && (
                  <Readiness plan={p} health={health} navigate={navigate} />
                )}
              </motion.div>
              <footer className="page-footer">
                <span>
                  <Sparkles size={13} />
                  Momenta · Make moments happen.
                </span>
                <span>
                  {ai.mode === "live"
                    ? "Live AI · approval required for each request"
                    : "Offline Demo · no model calls"}
                </span>
              </footer>
            </main>
          </div>
        </div>
        {notice && (
          <div className="toast" role="status">
            <CheckCheck size={19} />
            {notice}
          </div>
        )}
        <Modal
          title="Your celebrations"
          description="Pick up where you left off. Every demo is editable and saved locally."
          open={chooser}
          onClose={() => setChooser(false)}
        >
          <div className="event-list">
            {plans.map((event) => (
              <button
                key={event.id}
                className={
                  "event-option " + (event.id === p.id ? "selected" : "")
                }
                onClick={() => select(event)}
              >
                <img src={photo(event)} alt="" />
                <span>
                  <strong>{event.event.name}</strong>
                  <small>
                    {event.event.kind} · {event.event.guests} guests ·{" "}
                    {money(event.event.budget, event.event.currency)}
                  </small>
                </span>
                {event.id === p.id ? (
                  <Check size={20} />
                ) : (
                  <ArrowUpRight size={18} />
                )}
              </button>
            ))}
          </div>
          <Button
            className="full"
            onClick={() => {
              setChooser(false);
              setCreator(true);
            }}
          >
            <Plus size={16} />
            Plan a new celebration
          </Button>
        </Modal>
        <Modal
          title="Something wonderful starts here."
          description="Your people. Your priorities. Your kind of celebration."
          open={creator}
          onClose={() => setCreator(false)}
          wide
        >
          {creator && (
            <EventForm
              initialKind={initialKind}
              demo={guide === 0}
              busy={busy}
              onCancel={() => setCreator(false)}
              onSave={async (event) => {
                await save("/plans", event, "POST");
                setCreator(false);
                enterStudio();
                setPage("overview");
                if (guide === 0 && event.kind === "Wedding") setGuide(1);
              }}
            />
          )}
        </Modal>
        <Modal
          title="Your celebration, your way."
          description="Refine your brief. Date changes rebuild the timeline; written suggestions refresh."
          open={editingBrief}
          onClose={() => setEditingBrief(false)}
          wide
        >
          {editingBrief && (
            <EventForm
              existing={p}
              busy={busy}
              onCancel={() => setEditingBrief(false)}
              onSave={async (event) => {
                await save(`/plans/${p.id}/event`, {
                  revision: p.revision,
                  event,
                });
                setEditingBrief(false);
              }}
            />
          )}
        </Modal>
        <ProposalReview
          plan={p}
          proposal={proposal}
          busy={busy}
          onClose={() => {
            setProposal(null);
            if (guide === 4) setGuide(3);
          }}
          onConfirm={async () => {
            if (proposal) {
              await save(
                `/plans/${p.id}/confirm`,
                { token: proposal.token, confirmed: true },
                "POST",
              );
              setProposal(null);
              if (guide === 1) setGuide(2);
              else if (guide === 4) setGuide(5);
            }
          }}
        />
      </div>
    </MotionConfig>
  );
}

function Overview({
  plan: p,
  health: h,
  navigate,
  onCreate,
}: {
  plan: Plan;
  health: Health | null;
  navigate: (id: string) => void;
  onCreate: () => void;
}) {
  const currency = p.event.currency,
    next = p.tasks.find((t) => !t.done),
    pending = p.tasks
      .filter((t) => !t.done)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 3);
  return (
    <div className="page-enter">
      <SectionHead
        eyebrow="THE COMMAND CENTER"
        title="Your moment. Coming together."
        description="A little clarity, a little inspiration. Everything you need for your next big moment."
        action={
          <Button variant="secondary" onClick={onCreate}>
            <Plus size={16} />
            New celebration
          </Button>
        }
      />
      <div className="hero-layout">
        <section
          className="event-hero"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(26,25,21,.63),rgba(26,25,21,.10)),url(${photo(p)})`,
          }}
          aria-label="Your celebration"
        >
          <div className="hero-top">
            <span className="glass-pill">
              <span />
              YOUR NEXT BIG MOMENT
            </span>
            <span className="hero-event-type">{p.event.kind}</span>
          </div>
          <div className="hero-copy">
            <h2>
              {p.event.kind === "Wedding"
                ? "A beautiful beginning."
                : p.event.kind === "Birthday"
                  ? "More candles. More magic."
                  : "Ideas worth coming together for."}
            </h2>
            <p>{p.event.name}</p>
            <div className="hero-details">
              <span>
                <CalendarDays size={15} />
                {dateLabel(p.event.date)}
              </span>
              <span>
                <MapPin size={15} />
                {p.event.city}
              </span>
              <span>
                <Users size={15} />
                {p.event.guests} guests
              </span>
            </div>
          </div>
          <div className="hero-bottom">
            <span>{p.event.theme}</span>
            <button onClick={() => navigate("studio")}>
              Open event plan <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
        <section className="assistant-card">
          <div className="assistant-orbit">
            <Sparkles size={25} />
            <span className="orbit-dot" />
          </div>
          <Badge>YOUR PLANNING PARTNER</Badge>
          <h2>
            A little help.
            <br /> A lot of possibilities.
          </h2>
          <p>
            Ideas that feel like you. A plan that fits your budget. Let’s bring
            it all together.
          </p>
          <Button onClick={() => navigate("studio")}>
            <Sparkles size={15} />
            Let’s plan something
            <ArrowRight size={16} />
          </Button>
          <span className="assistant-foot">
            Thoughtful suggestions. You’re always in control.
          </span>
        </section>
      </div>
      <div className="stats-grid">
        <Metric
          icon={<Wallet />}
          label="Celebration budget"
          value={money(p.event.budget, currency)}
          detail={
            h
              ? `${money(h.actual, currency)} spent so far`
              : "Loading spending…"
          }
          tone="lavender"
        />
        <Metric
          icon={<Users />}
          label="People, together"
          value={String(p.event.guests)}
          detail={
            h
              ? `${money(h.per_guest, currency)} budget per guest`
              : "Your guest list allowance"
          }
          tone="peach"
        />
        <Metric
          icon={<CalendarCheck />}
          label="Making it happen"
          value={h ? `${h.completed} / ${h.task_count}` : "—"}
          detail="Planning tasks completed"
          progress={h?.progress || 0}
          tone="sage"
        />
        <Metric
          icon={<Clock3 />}
          label="The countdown"
          value={h ? `${Math.max(0, h.days_left)}` : "—"}
          detail="Days until your celebration"
          tone="sand"
        />
      </div>
      <div className="dashboard-lower">
        <section className="panel budget-preview">
          <PanelHead
            title="Beautifully within budget"
            subtitle="A place for every little detail."
            action={
              <button className="text-link" onClick={() => navigate("budget")}>
                Manage budget
                <ArrowUpRight size={14} />
              </button>
            }
          />
          <div className="budget-preview-content">
            <BudgetDonut plan={p} />
            <div className="budget-legend">
              {p.budget.slice(0, 4).map((r, i) => (
                <div key={r.category}>
                  <span>
                    <i style={{ background: colors[i] }} />
                    {r.category}
                  </span>
                  <strong>{money(r.allocated, currency)}</strong>
                </div>
              ))}
              <button className="text-link" onClick={() => navigate("budget")}>
                See all {p.budget.length} categories <ArrowRight size={13} />
              </button>
            </div>
          </div>
          <div className="panel-note">
            <span className="status-dot" />
            {h && h.planned > p.event.budget
              ? "Planned spending exceeds your budget. Review allocations."
              : "All allocations add up. A good place to start."}
          </div>
        </section>
        <section className="panel next-panel">
          <PanelHead
            title="One step closer"
            subtitle="Small steps. A wonderful celebration."
            action={
              <button
                className="text-link"
                onClick={() => navigate("timeline")}
              >
                View timeline
                <ArrowUpRight size={14} />
              </button>
            }
          />
          {pending.map((task, i) => (
            <button
              className="next-task"
              key={task.id}
              onClick={() => navigate("timeline")}
            >
              <span className={"task-index " + (i === 0 ? "first" : "")}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>{task.title}</strong>
                <small>
                  <CalendarDays size={12} />
                  {dateLabel(task.due, { day: "numeric", month: "short" })}
                  <i /> {task.priority} priority
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {!next && (
            <div className="empty">
              <CheckCheck />
              All your tasks are complete. Take a breath.
            </div>
          )}
          <div className="next-note">
            <Sparkles size={15} />
            {next
              ? "Start with the essentials. The details will follow."
              : "You’ve made room for a wonderful celebration."}
          </div>
        </section>
      </div>
      <div className="inspiration-strip">
        <div>
          <Badge tone="sage">
            <Leaf size={12} /> A LITTLE INSPIRATION
          </Badge>
          <h2>Make it yours. Make it meaningful.</h2>
          <p>Thoughtful details, beautiful palettes and ideas worth saving.</p>
          <button className="text-link" onClick={() => navigate("inspiration")}>
            Explore your inspiration board
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="inspiration-thumbs">
          <img
            src="/images/garden.webp"
            alt="Romantic floral celebration table"
          />
          <img
            src="/images/wedding.webp"
            alt="Warm candlelit wedding setting"
          />
          <div className="palette-stack">
            <span style={{ background: "#287D69" }} />
            <span style={{ background: "#D9C2B0" }} />
            <span style={{ background: "#A7AF98" }} />
            <span style={{ background: "#EFE5D6" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
  progress,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  progress?: number;
  tone: string;
}) {
  return (
    <section className="metric">
      <div className="metric-top">
        <span className={"metric-icon " + tone}>{icon}</span>
        <span>{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-detail">{detail}</div>
      {progress !== undefined && (
        <div
          className="progress slim"
          role="progressbar"
          aria-label={label}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: progress + "%" }} />
        </div>
      )}
    </section>
  );
}
export function BudgetDonut({ plan: p }: { plan: Plan }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="donut-wrap">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart accessibilityLayer>
          <Pie
            isAnimationActive={!reducedMotion}
            data={p.budget}
            dataKey="allocated"
            nameKey="category"
            innerRadius={65}
            outerRadius={88}
            paddingAngle={3}
            stroke="none"
          >
            {p.budget.map((r, i) => (
              <Cell key={r.category} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => money(Number(value), p.event.currency)}
            contentStyle={{
              borderRadius: 12,
              fontSize: 12,
              border: "1px solid #eae4ef",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-label">
        <small>TOTAL BUDGET</small>
        <strong>{money(p.event.budget, p.event.currency)}</strong>
      </div>
    </div>
  );
}
function Budget({
  plan: p,
  busy,
  save,
  onPreview,
}: {
  plan: Plan;
  busy: boolean;
  save: SaveFunction;
  onPreview: (p: Proposal) => void;
}) {
  const [rows, setRows] = useState<BudgetRow[]>(structuredClone(p.budget)),
    [invalid, setInvalid] = useState("");
  const allocated = rows.reduce((s, r) => s + r.allocated, 0),
    dirty = JSON.stringify(rows) !== JSON.stringify(p.budget);
  function edit(
    index: number,
    key: "allocated" | "planned" | "actual",
    value: string,
  ) {
    const n = Number(value);
    setRows((items) =>
      items.map((r, i) =>
        i === index
          ? { ...r, [key]: Number.isFinite(n) ? Math.round(n * 100) : 0 }
          : r,
      ),
    );
  }
  async function submit() {
    if (allocated !== p.event.budget) {
      setInvalid(
        "Allocations must add up to " +
          money(p.event.budget, p.event.currency) +
          ". Move funds between categories or use Budget Rescue to change the total.",
      );
      return;
    }
    setInvalid("");
    try {
      await save(`/plans/${p.id}/budget`, { revision: p.revision, rows });
    } catch {}
  }
  return (
    <div className="page-enter">
      <SectionHead
        eyebrow="ROOM FOR WHAT MATTERS"
        title="Your budget, beautifully balanced."
        description="Give every detail its place. Keep the big picture in view."
        action={
          <ExportButton planId={p.id} kind="budget">
            <Download size={16} />
            Export budget
          </ExportButton>
        }
      />
      <div className="budget-studio-top">
        <section className="panel">
          <PanelHead
            title="The celebration fund"
            subtitle="Illustrative allowances · not vendor quotations"
          />
          <div className="budget-totals">
            <div>
              <small>Available budget</small>
              <strong>{money(p.event.budget, p.event.currency)}</strong>
            </div>
            <div>
              <small>Actual spending</small>
              <strong>
                {money(
                  rows.reduce((s, r) => s + r.actual, 0),
                  p.event.currency,
                )}
              </strong>
            </div>
            <div>
              <small>Remaining balance</small>
              <strong>
                {money(
                  p.event.budget - rows.reduce((s, r) => s + r.actual, 0),
                  p.event.currency,
                )}
              </strong>
            </div>
          </div>
          <p className="quiet">
            Edit allocations, planned costs and actual spending below. All
            totals are validated again in Python before saving.
          </p>
        </section>
        <section className="panel chart-panel">
          <BudgetDonut plan={{ ...p, budget: rows }} />
        </section>
      </div>
      <section className="panel allocation-panel">
        <PanelHead
          title="Every detail accounted for"
          subtitle={`Enter amounts in ${p.event.currency}. Allocations must total the event budget.`}
          action={
            <Badge tone={dirty ? "sand" : "sage"}>
              {dirty ? "Unsaved changes" : "Saved to your plan"}
            </Badge>
          }
        />
        {invalid && (
          <div className="alert error" role="alert">
            <TriangleAlert size={16} />
            {invalid}
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Allocated</th>
                <th>Planned</th>
                <th>Actual spent</th>
                <th>Budget health</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.category}>
                  <th scope="row">
                    <span className="category-cell">
                      <span
                        className="category-dot"
                        style={{ background: colors[i % colors.length] }}
                      />
                      {r.category}
                    </span>
                  </th>
                  {(["allocated", "planned", "actual"] as const).map((key) => (
                    <td key={key}>
                      <input
                        aria-label={`${r.category} ${key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={r[key] / 100}
                        onChange={(e) => edit(i, key, e.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <Badge
                      tone={
                        r.actual > r.allocated || r.planned > r.allocated
                          ? "rose"
                          : "sage"
                      }
                    >
                      {r.actual > r.allocated || r.planned > r.allocated
                        ? "Review spending"
                        : "Within allocation"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <td>{money(allocated, p.event.currency)}</td>
                <td>
                  {money(
                    rows.reduce((s, r) => s + r.planned, 0),
                    p.event.currency,
                  )}
                </td>
                <td>
                  {money(
                    rows.reduce((s, r) => s + r.actual, 0),
                    p.event.currency,
                  )}
                </td>
                <td>
                  {allocated === p.event.budget ? (
                    <span className="positive">
                      <Check size={14} />
                      Balanced
                    </span>
                  ) : (
                    <span className="negative">
                      {money(p.event.budget - allocated, p.event.currency)} to
                      balance
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="save-bar">
          <span>
            <ShieldCheck size={15} />
            Changes are saved only when you choose.
          </span>
          <div>
            <Button
              variant="secondary"
              disabled={!dirty || busy}
              onClick={() => {
                setRows(structuredClone(p.budget));
                setInvalid("");
              }}
            >
              Reset edits
            </Button>
            <Button disabled={!dirty || busy} onClick={() => void submit()}>
              {busy ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              Save budget
            </Button>
          </div>
        </div>
      </section>
      <Rescue plan={p} onPreview={onPreview} />
    </div>
  );
}
