import { ArrowRight, Check, Play, X } from "lucide-react";
import { Button, Badge } from "./ui";
import { ExportButton } from "./ExportButton";
import type { Plan } from "../types";
const steps = [
  {
    title: "Create a wedding",
    time: "20 sec",
    copy: "Create the prefilled illustrative Bengaluru wedding. Keep the vegetarian menu, Telugu traditions and catering/photography priorities.",
    page: "overview",
  },
  {
    title: "Generate a personalized plan",
    time: "20 sec",
    copy: "Open Planning Studio and generate a plan. Offline Demo is free; Live AI requires explicit request approval. Review and apply the suggestion preview.",
    page: "studio",
  },
  {
    title: "Review the budget",
    time: "15 sec",
    copy: "Inspect allocations, recorded spending and the chart. Python validates every budget total.",
    page: "budget",
  },
  {
    title: "Try Budget Rescue",
    time: "25 sec",
    copy: "Choose “Explore a new budget”. Set ₹7,00,000 and protect Catering and Photography. Preview the trade-offs and affected tasks.",
    page: "budget",
  },
  {
    title: "Confirm the changes",
    time: "10 sec",
    copy: "In the preview, review before/after amounts and new tasks. Select the confirmation checkbox, then apply. Nothing is silently overwritten.",
    page: "budget",
  },
  {
    title: "Review readiness",
    time: "15 sec",
    copy: "Inspect the transparent readiness score, warnings and next steps. Optionally run the independent AI Critic in Live AI mode.",
    page: "readiness",
  },
  {
    title: "Export your plan",
    time: "15 sec",
    copy: "Download the complete PDF. Budget, timeline and vendor CSVs are also available in Readiness.",
    page: "readiness",
  },
];
export function DemoGuide({
  step,
  plan,
  onCreate,
  onNavigate,
  onStep,
  onClose,
}: {
  step: number;
  plan: Plan;
  onCreate: () => void;
  onNavigate: (p: string) => void;
  onStep: (n: number) => void;
  onClose: () => void;
}) {
  const current = steps[Math.min(step, 6)];
  return (
    <section
      className="demo-guide"
      aria-label="Two-minute guided demonstration"
    >
      <div className="demo-guide-head">
        <Badge>
          <Play size={11} />
          TWO-MINUTE WALKTHROUGH
        </Badge>
        <span>
          {step >= 7 ? "Complete" : `Step ${step + 1} of 7 · ${current.time}`}
        </span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close guided demo"
        >
          <X size={16} />
        </button>
      </div>
      <div className="demo-step-dots">
        {steps.map((s, i) => (
          <span
            key={s.title}
            className={i < step ? "complete" : i === step ? "current" : ""}
            title={s.title}
          >
            {i < step ? <Check size={10} /> : i + 1}
          </span>
        ))}
      </div>
      {step >= 7 ? (
        <>
          <h2>A celebration plan, ready to share.</h2>
          <p>
            You’ve created a wedding, generated a personalized plan, rescued its
            budget, confirmed the changes, reviewed readiness and prepared the
            export. Check your browser downloads to save the file.
          </p>
          <Button variant="secondary" onClick={onClose}>
            Finish walkthrough
          </Button>
        </>
      ) : (
        <>
          <h2>{current.title}</h2>
          <p>{current.copy}</p>
          <div className="demo-actions">
            {step === 0 ? (
              <Button onClick={onCreate}>
                Create the demo wedding
                <ArrowRight size={14} />
              </Button>
            ) : step === 6 ? (
              <ExportButton
                planId={plan.id}
                kind="pdf"
                onReady={() => onStep(7)}
              >
                Download walkthrough PDF
                <ArrowRight size={14} />
              </ExportButton>
            ) : (
              <Button
                variant="secondary"
                onClick={() => onNavigate(current.page)}
              >
                Open{" "}
                {current.page === "studio"
                  ? "Planning Studio"
                  : current.page === "budget"
                    ? "Budget Studio"
                    : "Readiness"}
                <ArrowRight size={14} />
              </Button>
            )}
            {(step === 2 || step === 5) && (
              <Button
                onClick={() => {
                  onStep(step + 1);
                  onNavigate(steps[step + 1].page);
                }}
              >
                I’ve reviewed this step
                <Check size={14} />
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
