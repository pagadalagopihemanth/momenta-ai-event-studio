import { useState } from "react";
import type { FormEvent } from "react";
import {
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  LoaderCircle,
  GitCompareArrows,
} from "lucide-react";
import type { Plan, Proposal } from "../types";
import { request, money } from "../api";
import { Button, Badge, Modal } from "../components/ui";
import type { Preview } from "./shared";
import { useAI } from "../components/AIContext";

export function Rescue({
  plan: p,
  onPreview,
}: {
  plan: Plan;
  onPreview: Preview;
}) {
  const ai = useAI();
  const [open, setOpen] = useState(false),
    [target, setTarget] = useState(p.event.budget / 100),
    [protectedNames, setProtected] = useState(
      p.event.priorities.filter((c) => p.budget.some((r) => r.category === c)),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function preview(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (ai.mode === "live") {
        const result = await ai.run(p, "rescue", {
          target: Math.round(target * 100),
          protected: protectedNames,
          instruction:
            "Explain practical savings and trade-offs for this revised budget while preserving protected categories. Give concrete scope changes and next actions.",
        });
        if (result.proposal) onPreview(result.proposal);
        setOpen(false);
        return;
      }
      onPreview(
        await request<Proposal>(`/plans/${p.id}/rescue`, "POST", {
          revision: p.revision,
          target: Math.round(target * 100),
          protected: protectedNames,
        }),
      );
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="rescue-banner" id="budget-rescue">
        <div className="rescue-icon">
          <Sparkles size={25} />
        </div>
        <div>
          <Badge>THE BUDGET RESCUE</Badge>
          <h2>A change of plans. Still a beautiful celebration.</h2>
          <p>
            Keep what matters. Find thoughtful savings. Review every change
            before applying.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          Explore a new budget
          <ArrowUpRight size={16} />
        </Button>
      </section>
      <Modal
        title="Let’s make the numbers work."
        description="Protect your priorities. We’ll redistribute flexible categories using the existing Python budget engine."
        open={open}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void preview(e)}>
          <label>
            Your revised budget · {p.event.currency}
            <input
              type="number"
              min={1}
              max={10000000000}
              step="0.01"
              required
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
            <small>
              Current budget: {money(p.event.budget, p.event.currency)}
            </small>
          </label>
          <fieldset className="priority-field">
            <legend>Keep these allocations protected</legend>
            <div className="check-chips">
              {p.budget.map((r) => (
                <label key={r.category}>
                  <input
                    type="checkbox"
                    checked={protectedNames.includes(r.category)}
                    onChange={(e) =>
                      setProtected((names) =>
                        e.target.checked
                          ? [...names, r.category]
                          : names.filter((c) => c !== r.category),
                      )
                    }
                  />
                  {r.category}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="context-note">
            <ShieldCheck size={17} />
            <p>
              Recorded expenses are always a floor. If the target cannot cover
              protected allocations and expenses, we’ll ask you to revise it.
            </p>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <Button className="full" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <GitCompareArrows size={16} />
            )}
            Preview changes
          </Button>
        </form>
      </Modal>
    </>
  );
}
