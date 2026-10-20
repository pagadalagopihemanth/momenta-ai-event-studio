import { useState } from "react";
import type { FormEvent } from "react";
import {
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Users,
  SlidersHorizontal,
  LoaderCircle,
  Wallet,
  RefreshCw,
  PanelTop,
  Sun,
  GitCompareArrows,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { Plan } from "../types";
import { request, money } from "../api";
import { Button, Badge } from "../components/ui";
import { SectionHead, PanelHead } from "../components/layout";

interface Simulation {
  guests: number;
  setting: string;
  theme: string;
  budget: number;
  rows: { category: string; current: number; scenario: number }[];
  total: number;
  headroom: number;
  per_guest: number;
  tasks: string[];
  assumptions: string;
}

export function Simulator({ plan: p }: { plan: Plan }) {
  const [guests, setGuests] = useState(p.event.guests),
    [budget, setBudget] = useState(p.event.budget / 100),
    [setting, setSetting] = useState<"Indoor" | "Outdoor">("Indoor"),
    [theme, setTheme] = useState<"Traditional" | "Modern">("Traditional"),
    [result, setResult] = useState<Simulation | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  async function simulate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(
        await request<Simulation>(`/plans/${p.id}/simulate`, "POST", {
          guests,
          budget: Math.round(budget * 100),
          setting,
          theme,
        }),
      );
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-enter">
      <SectionHead
        eyebrow="A LITTLE CURIOSITY GOES A LONG WAY"
        title="What if it could be different?"
        description="Explore the possibilities before you make a commitment. Your saved plan stays as it is."
      />
      <div className="simulation-layout">
        <form
          className="panel simulation-controls"
          onSubmit={(e) => void simulate(e)}
        >
          <PanelHead
            title="Imagine another version"
            subtitle="Adjust the details. See what changes."
          />
          <label>
            How many guests?
            <div className="input-with-icon">
              <Users size={16} />
              <input
                type="number"
                required
                min={1}
                max={100000}
                value={guests}
                onChange={(e) => {
                  setGuests(Number(e.target.value));
                  setDirty(true);
                }}
              />
            </div>
          </label>
          <label>
            Your scenario budget · {p.event.currency}
            <div className="input-with-icon">
              <Wallet size={16} />
              <input
                type="number"
                min={1}
                max={10000000000}
                required
                value={budget}
                onChange={(e) => {
                  setBudget(Number(e.target.value));
                  setDirty(true);
                }}
              />
            </div>
          </label>
          <fieldset>
            <legend>The setting</legend>
            <div className="choice-grid">
              {(["Indoor", "Outdoor"] as const).map((value) => (
                <button
                  type="button"
                  className={"choice " + (setting === value ? "active" : "")}
                  key={value}
                  aria-pressed={setting === value}
                  onClick={() => {
                    setSetting(value);
                    setDirty(true);
                  }}
                >
                  {value === "Indoor" ? (
                    <PanelTop size={21} />
                  ) : (
                    <Sun size={21} />
                  )}{" "}
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            The feeling
            <select
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value as "Traditional" | "Modern");
                setDirty(true);
              }}
            >
              <option>Traditional</option>
              <option>Modern</option>
            </select>
          </label>
          <Button className="full" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <GitCompareArrows size={16} />
            )}
            Compare possibilities
          </Button>
          <p className="quiet">
            <ShieldCheck size={12} />A simulation only. Nothing is saved.
          </p>
        </form>
        <div className="simulation-results">
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {!result ? (
            <div className="simulation-empty">
              <div className="comparison-art">
                <div>
                  <Users size={23} />
                  <span>{p.event.guests}</span>
                </div>
                <GitCompareArrows size={29} />
                <div>
                  <Sparkles size={23} />
                  <span>What if?</span>
                </div>
              </div>
              <h2>
                More possibilities.
                <br />
                Fewer surprises.
              </h2>
              <p>
                Compare guest counts, spending and settings with a clear picture
                of the trade-offs.
              </p>
              <Badge tone="purple">YOUR PLAN IS SAFE TO EXPLORE</Badge>
            </div>
          ) : (
            <>
              {dirty && (
                <div className="alert pending-alert">
                  <RefreshCw size={16} />
                  Inputs changed. Compare again to refresh these results.
                </div>
              )}
              <div className="scenario-cards">
                <section className="panel">
                  <Badge tone="neutral">YOUR CURRENT PLAN</Badge>
                  <h2>{p.event.theme}</h2>
                  <div className="scenario-metric">
                    <span>Planned spending</span>
                    <strong>
                      {money(
                        p.budget.reduce((s, r) => s + r.planned, 0),
                        p.event.currency,
                      )}
                    </strong>
                  </div>
                  <p>
                    <Users size={14} />
                    {p.event.guests} guests <span>·</span> {p.event.location}
                  </p>
                </section>
                <section className="panel scenario-alternate">
                  <Badge>THE POSSIBILITY</Badge>
                  <h2>
                    {result.theme} · {result.setting}
                  </h2>
                  <div className="scenario-metric">
                    <span>Projected spending</span>
                    <strong>{money(result.total, p.event.currency)}</strong>
                  </div>
                  <p>
                    <Users size={14} />
                    {result.guests} guests <span>·</span>{" "}
                    {money(result.per_guest, p.event.currency)} per guest
                  </p>
                  <Badge tone={result.headroom >= 0 ? "sage" : "rose"}>
                    {money(result.headroom, p.event.currency)}{" "}
                    {result.headroom >= 0 ? "headroom" : "budget shortfall"}
                  </Badge>
                </section>
              </div>
              <section className="panel">
                <PanelHead
                  title="Where the difference lives"
                  subtitle="Category comparison · major currency units"
                />
                <div className="scenario-chart">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={result.rows.map((r) => ({
                        category: r.category,
                        Current: r.current / 100,
                        Scenario: r.scenario / 100,
                      }))}
                      margin={{ left: -10, bottom: 30, right: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 5"
                        vertical={false}
                        stroke="#ede7f2"
                      />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 9, fill: "#9a87a6" }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#9a87a6" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, fontSize: 11 }}
                        formatter={(value) =>
                          money(Number(value) * 100, p.event.currency)
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 20 }} />
                      <Bar
                        dataKey="Current"
                        fill="#D6C7E2"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="Scenario"
                        fill="#9471B1"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <details className="accessible-data">
                  <summary>View comparison as a table</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Current</th>
                        <th>Scenario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((r) => (
                        <tr key={r.category}>
                          <th>{r.category}</th>
                          <td>{money(r.current, p.event.currency)}</td>
                          <td>{money(r.scenario, p.event.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </section>
              <section className="panel">
                <PanelHead title="What else would need to change?" />
                {result.tasks.map((task) => (
                  <div className="simulation-task" key={task}>
                    <ArrowUpRight size={15} />
                    {task}
                  </div>
                ))}
                <div className="context-note">
                  <SlidersHorizontal size={17} />
                  <p>{result.assumptions}</p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
