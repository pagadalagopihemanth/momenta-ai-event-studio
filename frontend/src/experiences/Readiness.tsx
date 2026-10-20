import {
  Sparkles,
  ArrowUpRight,
  Download,
  CalendarDays,
  Heart,
  TriangleAlert,
  LoaderCircle,
  Wallet,
} from "lucide-react";
import type { Plan, Health } from "../types";
import { Badge, Button } from "../components/ui";
import { useState } from "react";
import { useAI } from "../components/AIContext";
import { request } from "../api";
import { ExportButton } from "../components/ExportButton";
import type { AIReview } from "../types";
import { SectionHead, PanelHead } from "../components/layout";

export function Readiness({
  plan: p,
  health: h,
  navigate,
}: {
  plan: Plan;
  health: Health | null;
  navigate: (page: string) => void;
}) {
  const ai = useAI();
  const [review, setReview] = useState<(AIReview & { mode: string }) | null>(
      null,
    ),
    [reviewing, setReviewing] = useState(false),
    [error, setError] = useState("");
  async function critique() {
    setReviewing(true);
    setError("");
    try {
      if (ai.mode === "live") {
        const result = await ai.run(p, "critic", {
          instruction:
            "Review budget consistency, missing vendors, timeline feasibility, requirement conflicts, risks and unfinished tasks. State what cannot be verified and recommend concrete next steps.",
        });
        if (result.review) setReview({ ...result.review, mode: "live" });
      } else {
        const fresh = await request<Health>(`/plans/${p.id}/overview`);
        setReview({
          summary: "Offline rule-based planning review",
          findings: fresh.warnings,
          next_actions: p.suggestions.next_actions,
          revision: p.revision,
          subjective: false,
          mode: "offline",
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReviewing(false);
    }
  }
  return (
    <div className="page-enter">
      <SectionHead
        eyebrow="CLARITY BEFORE THE CELEBRATION"
        title="A thoughtful check-in."
        description="See what’s ready, what needs a little love and where to go next."
        action={
          <ExportButton planId={p.id} kind="pdf">
            <Download size={15} />
            Download complete plan
          </ExportButton>
        }
      />
      {!h ? (
        <div className="panel empty">
          <LoaderCircle className="spin" />
          Reviewing your plan…
        </div>
      ) : (
        <>
          <div className="readiness-top">
            <section className="panel readiness-score">
              <div
                className="score-ring"
                style={{
                  background: `conic-gradient(#9B7CB4 ${h.score * 3.6}deg,#EEE6F3 0)`,
                }}
              >
                <div>
                  <strong>
                    {h.score}
                    <span>/100</span>
                  </strong>
                  <small>PLANNING READINESS</small>
                </div>
              </div>
              <h2>
                {h.score >= 80
                  ? "Coming together beautifully."
                  : h.score >= 50
                    ? "Good momentum. Keep going."
                    : "A beautiful beginning, with room to grow."}
              </h2>
              <p>
                A transparent progress measure, never a certification of safety
                or event quality.
              </p>
              <Badge tone={h.score >= 80 ? "sage" : "sand"}>
                {h.score >= 80
                  ? "Final details to verify"
                  : "Essential planning still ahead"}
              </Badge>
            </section>
            <section className="panel score-breakdown">
              <PanelHead
                title="No black box. Just your progress."
                subtitle="Your score is the sum of these four checks, calculated in Python."
              />
              {h.breakdown.map((b) => (
                <div className="score-part" key={b.label}>
                  <div>
                    <span>{b.label}</span>
                    <strong>
                      {b.earned}
                      <small> / {b.possible}</small>
                    </strong>
                  </div>
                  <div className="progress">
                    <span
                      style={{ width: (b.earned / b.possible) * 100 + "%" }}
                    />
                  </div>
                </div>
              ))}
              <p className="quiet">
                Tasks: up to 40 points · Booked vendors: up to 30 · Planned and
                actual spend within budget and category actuals within
                allocations: 20 · No overdue tasks: 10. Partial points are
                rounded.
              </p>
            </section>
          </div>
          <section className="panel readiness-warnings">
            <PanelHead
              title="A little attention here goes a long way"
              subtitle="Rule-based checks from the existing Python plan critic. These are recommendations, not verified facts."
            />
            <div className="warning-list">
              {h.warnings.map((warning, i) => (
                <div className="readiness-warning" key={i}>
                  <span className="warning-icon">
                    <TriangleAlert size={18} />
                  </span>
                  <div>
                    <h3>
                      {i === 0
                        ? "Your next thoughtful step"
                        : "Something to keep in view"}
                    </h3>
                    <p>{warning}</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() =>
                      navigate(
                        warning.toLowerCase().includes("vendor")
                          ? "vendors"
                          : warning.toLowerCase().includes("spending")
                            ? "budget"
                            : "timeline",
                      )
                    }
                  >
                    Take a look
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section className="panel ai-critic-panel">
            <PanelHead
              title="AI Plan Critic"
              subtitle="A second perspective, separate from your deterministic readiness score."
              action={
                <Button
                  variant="secondary"
                  disabled={reviewing}
                  onClick={() => void critique()}
                >
                  {reviewing ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}{" "}
                  {reviewing
                    ? "Reviewing…"
                    : ai.mode === "live"
                      ? "Run AI Plan Critic"
                      : "Run offline plan check"}
                </Button>
              }
            />
            {error && (
              <p role="alert" className="export-error">
                {error}
              </p>
            )}
            {review ? (
              <>
                <Badge tone={review.mode === "live" ? "purple" : "sage"}>
                  {review.mode === "live"
                    ? "LIVE AI · SUBJECTIVE REVIEW"
                    : "OFFLINE DEMO · RULE-BASED CHECKS"}
                </Badge>
                {review.revision !== p.revision && (
                  <p className="export-error">
                    This review is for an older revision. Run it again for your
                    current plan.
                  </p>
                )}
                <h3>{review.summary}</h3>
                <ul>
                  {review.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <h3>Recommended next steps</h3>
                <ul>
                  {review.next_actions.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="quiet">
                {ai.mode === "live"
                  ? "An independent model-powered review. Each request needs approval; the review never changes the readiness score or saves plan changes."
                  : "Offline Demo uses the existing Python critic. Select Live AI for an independent model-powered review."}
              </p>
            )}
          </section>
          <section className="export-studio">
            <PanelHead
              title="A plan worth keeping"
              subtitle="Clean exports, generated by your existing Python services."
            />
            <div className="export-grid">
              {[
                {
                  type: "pdf",
                  title: "The complete plan",
                  copy: "Your celebration, from big picture to little details.",
                  icon: Sparkles,
                },
                {
                  type: "budget",
                  title: "Budget breakdown",
                  copy: "Allocations, planned costs and actual expenses.",
                  icon: Wallet,
                },
                {
                  type: "tasks",
                  title: "Your preparation timeline",
                  copy: "Tasks, priorities, due dates and dependencies.",
                  icon: CalendarDays,
                },
                {
                  type: "vendors",
                  title: "Vendor checklist",
                  copy: "Allowances, contacts, statuses and notes.",
                  icon: Heart,
                },
              ].map(({ type, title, copy, icon: Icon }) => (
                <ExportButton
                  planId={p.id}
                  kind={type}
                  className="panel export-card"
                  key={type}
                >
                  <Icon size={21} />
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <span>
                    {type === "pdf" ? "PDF DOCUMENT" : "CSV SPREADSHEET"}
                    <Download size={14} />
                  </span>
                </ExportButton>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
