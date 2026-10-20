import { motion, useReducedMotion } from "motion/react";
import { LockKeyhole } from "lucide-react";
import type { Plan } from "../types";
import { money } from "../api";

/** Visualizes validated server allocations; never changes or persists a proposal. */
export function BudgetComparison({
  before,
  after,
}: {
  before: Plan;
  after: Plan;
}) {
  const reduced = useReducedMotion();
  const savings = before.event.budget - after.event.budget;
  if (
    !savings &&
    JSON.stringify(before.budget) === JSON.stringify(after.budget)
  )
    return null;
  const maximum = Math.max(
    1,
    ...before.budget.map((r) => r.allocated),
    ...after.budget.map((r) => r.allocated),
  );
  return (
    <section className="saving-viz" aria-label="Budget change visualization">
      <div className="saving-viz-header">
        <div>
          <h3>
            {savings > 0
              ? "A little less spend. The same big moment."
              : "A new balance for your big moment."}
          </h3>
          <p>Review the trade-offs before you commit.</p>
        </div>
        <strong>
          {money(Math.abs(savings), before.event.currency)}
          <p>{savings >= 0 ? "lower budget" : "additional budget"}</p>
        </strong>
      </div>
      {after.budget.map((row) => {
        const previous =
          before.budget.find((r) => r.category === row.category)?.allocated ||
          0;
        const protectedCategory =
          before.event.priorities.some(
            (p) => p.toLowerCase() === row.category.toLowerCase(),
          ) && previous === row.allocated;
        return (
          <div className="saving-row" key={row.category}>
            <span>
              {protectedCategory && (
                <LockKeyhole size={11} aria-label="Priority unchanged" />
              )}
              {row.category}
            </span>
            <div className="saving-bars">
              <div
                className="saving-before"
                style={{ width: `${(previous / maximum) * 100}%` }}
              />
              <motion.div
                className="saving-bar"
                initial={{
                  width: `${(previous / maximum) * 100}%`,
                }}
                animate={{
                  width: `${(row.allocated / maximum) * 100}%`,
                }}
                transition={{ duration: reduced ? 0 : 0.65, ease: "easeOut" }}
              />
            </div>
            <small>
              {row.allocated === previous
                ? "Unchanged"
                : money(row.allocated - previous, before.event.currency)}
            </small>
          </div>
        );
      })}
      <div className="saving-legend">
        <span>
          <i />
          Current allocation
        </span>
        <span>
          <i />
          Proposed allocation
        </span>
      </div>
    </section>
  );
}
