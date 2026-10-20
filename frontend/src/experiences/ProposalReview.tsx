import { useEffect, useState } from "react";
import { ArrowRight, CheckCheck, LoaderCircle } from "lucide-react";
import type { Plan, Proposal } from "../types";
import { money, dateLabel } from "../api";
import { Button, Badge, Modal } from "../components/ui";

export function ProposalReview({
  plan: p,
  proposal: q,
  busy,
  onConfirm,
  onClose,
}: {
  plan: Plan;
  proposal: Proposal | null;
  busy: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false),
    [confirmError, setConfirmError] = useState("");
  useEffect(() => {
    setConfirmed(false);
    setConfirmError("");
  }, [q?.token]);
  if (!q) return null;
  const newTasks = q.plan.tasks.filter(
    (t) => !p.tasks.some((old) => old.id === t.id),
  );
  const changed =
    q.plan.suggestions !== p.suggestions &&
    JSON.stringify(q.plan.suggestions) !== JSON.stringify(p.suggestions);
  return (
    <Modal
      title="A thoughtful change of plans."
      description="This is a preview. Nothing changes in your saved celebration until you confirm."
      open={true}
      onClose={onClose}
      wide
    >
      <div className="proposal-budget">
        <div>
          <span>CURRENT BUDGET</span>
          <strong>{money(p.event.budget, p.event.currency)}</strong>
        </div>
        <ArrowRight size={22} />
        <div>
          <span>PROPOSED BUDGET</span>
          <strong>{money(q.plan.event.budget, p.event.currency)}</strong>
        </div>
        <Badge tone="sand">AWAITING YOUR REVIEW</Badge>
      </div>
      <p className="proposal-explanation">{q.explanation}</p>
      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Current allocation</th>
              <th>Proposed</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {q.plan.budget.map((r, i) => {
              const before =
                p.budget.find((b) => b.category === r.category)?.allocated || 0;
              return (
                <tr key={i}>
                  <th>{r.category}</th>
                  <td>{money(before, p.event.currency)}</td>
                  <td>{money(r.allocated, p.event.currency)}</td>
                  <td className={r.allocated < before ? "positive" : ""}>
                    {r.allocated === before
                      ? "Unchanged"
                      : money(r.allocated - before, p.event.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {newTasks.length > 0 && (
        <div className="proposal-details">
          <h3>Tasks added to keep your plan in sync</h3>
          <ul>
            {newTasks.map((t) => (
              <li key={t.id}>
                {t.title} · {dateLabel(t.due)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {changed && (
        <div className="proposal-details">
          <h3>Proposed written suggestions</h3>
          {Object.entries(q.plan.suggestions).map(([key, value]) => (
            <details key={key}>
              <summary>{key.replace("_", " ")}</summary>
              {typeof value === "string" ? (
                <p>{value}</p>
              ) : (
                <ul>
                  {(value as string[]).map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      )}
      {confirmError && (
        <div className="alert error" role="alert">
          {confirmError}
        </div>
      )}
      <label className="confirm-check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>I’ve reviewed the changes and confirm saving this proposal.</span>
      </label>
      <div className="modal-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Keep current plan
        </Button>
        <Button
          disabled={!confirmed || busy}
          onClick={() =>
            void onConfirm().catch((e) => setConfirmError(e.message))
          }
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <CheckCheck size={16} />
          )}
          Apply confirmed changes
        </Button>
      </div>
    </Modal>
  );
}
