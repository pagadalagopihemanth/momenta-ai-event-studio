import { useState } from "react";
import type { FormEvent } from "react";
import { Sparkles, ArrowRight, LoaderCircle } from "lucide-react";
import type { Plan, Event } from "../types";
import { Button } from "../components/ui";

export function EventForm({
  existing,
  busy,
  onSave,
  onCancel,
  demo = false,
  initialKind = "Wedding",
}: {
  existing?: Plan;
  busy: boolean;
  onSave: (event: Event) => Promise<void>;
  onCancel: () => void;
  demo?: boolean;
  initialKind?: Event["kind"];
}) {
  const [step, setStep] = useState(0),
    [error, setError] = useState("");
  const [event, setEvent] = useState<Event>(
    existing?.event || {
      name: demo ? "Ananya & Arjun · Guided wedding demo" : "",
      kind: demo ? "Wedding" : initialKind,
      date: new Date(Date.now() + 120 * 86400000).toLocaleDateString("en-CA"),
      city: "Bengaluru",
      location: "Venue to be decided",
      budget:
        demo || initialKind === "Wedding"
          ? 90000000
          : initialKind === "Birthday"
            ? 5000000
            : 15000000,
      currency: "INR",
      guests:
        demo || initialKind === "Wedding"
          ? 300
          : initialKind === "Birthday"
            ? 40
            : 150,
      duration: demo || initialKind === "Wedding" ? 6 : 4,
      theme:
        demo || initialKind === "Wedding"
          ? "Traditional South Indian"
          : initialKind === "Birthday"
            ? "Modern themed party"
            : "AI developer community",
      preferences: demo
        ? "Telugu traditions; vegetarian menu; step-free access; label allergens."
        : "",
      must_have: "",
      optional: "",
      priorities: ["Catering", "Photography"],
      illustrative: demo,
    },
  );
  const update = <K extends keyof Event>(key: K, value: Event[K]) =>
    setEvent((e) => ({ ...e, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 0) {
      setStep(1);
      return;
    }
    try {
      await onSave(event);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <form onSubmit={(e) => void submit(e)} className="event-form">
      <div className="form-steps">
        <span className={step === 0 ? "active" : ""}>01 · The occasion</span>
        <span className={step === 1 ? "active" : ""}>
          02 · Make it personal
        </span>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {step === 0 ? (
        <div className="form-grid">
          <label className="span-2">
            What are we celebrating?
            <input
              required
              maxLength={120}
              placeholder="Give your celebration a name"
              value={event.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label>
            Event type
            <select
              value={event.kind}
              onChange={(e) => update("kind", e.target.value as Event["kind"])}
            >
              <option>Wedding</option>
              <option>Birthday</option>
              <option>Community event</option>
            </select>
          </label>
          <label>
            Event date
            <input
              type="date"
              required
              min={new Date().toLocaleDateString("en-CA")}
              value={event.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </label>
          <label>
            City
            <input
              required
              value={event.city}
              maxLength={120}
              onChange={(e) => update("city", e.target.value)}
            />
          </label>
          <label>
            Location / venue
            <input
              required
              value={event.location}
              maxLength={300}
              onChange={(e) => update("location", e.target.value)}
            />
          </label>
          <label>
            Expected guests
            <input
              type="number"
              required
              min={1}
              max={100000}
              value={event.guests}
              onChange={(e) => update("guests", Number(e.target.value))}
            />
          </label>
          <label>
            Duration in hours
            <input
              type="number"
              required
              min={1}
              max={168}
              value={event.duration}
              onChange={(e) => update("duration", Number(e.target.value))}
            />
          </label>
          <label>
            Budget
            <input
              type="number"
              required
              min={1}
              max={10000000000}
              step="0.01"
              value={event.budget / 100}
              disabled={!!existing}
              onChange={(e) =>
                update("budget", Math.round(Number(e.target.value) * 100))
              }
            />
            {existing && <small>Change the total through Budget Rescue.</small>}
          </label>
          <label>
            Currency
            <select
              disabled={!!existing}
              value={event.currency}
              onChange={(e) =>
                update("currency", e.target.value as Event["currency"])
              }
            >
              {["INR", "USD", "EUR", "GBP"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="form-grid">
          <label className="span-2">
            Your theme or feeling
            <input
              maxLength={300}
              value={event.theme}
              onChange={(e) => update("theme", e.target.value)}
              placeholder="Intimate, traditional, a little whimsical…"
            />
          </label>
          <label className="span-2">
            Cultural, dietary & accessibility preferences
            <textarea
              maxLength={2000}
              value={event.preferences}
              onChange={(e) => update("preferences", e.target.value)}
              placeholder="Vegetarian menu, Telugu traditions, step-free access…"
            />
          </label>
          <label>
            Must-have moments
            <textarea
              maxLength={2000}
              value={event.must_have}
              onChange={(e) => update("must_have", e.target.value)}
            />
          </label>
          <label>
            Nice to have
            <textarea
              maxLength={2000}
              value={event.optional}
              onChange={(e) => update("optional", e.target.value)}
            />
          </label>
          <fieldset className="span-2">
            <legend>What matters most?</legend>
            <div className="check-chips">
              {[
                "Venue",
                "Catering",
                "Decorations",
                "Photography",
                "Entertainment",
                "Transportation",
                "Accommodation",
              ].map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    checked={event.priorities.includes(category)}
                    onChange={(e) =>
                      update(
                        "priorities",
                        e.target.checked
                          ? [...event.priorities, category]
                          : event.priorities.filter((c) => c !== category),
                      )
                    }
                  />
                  {category}
                </label>
              ))}
            </div>
          </fieldset>
          {existing && (
            <p className="quiet span-2">
              Saving refreshes the written suggestions. Changing the date
              rebuilds the timeline and resets task completion. Budget and
              vendor records are preserved.
            </p>
          )}
        </div>
      )}
      <div className="modal-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={() => (step === 1 ? setStep(0) : onCancel())}
        >
          {step === 1 ? "Back" : "Cancel"}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}{" "}
          {step === 0
            ? "Make it personal"
            : existing
              ? "Save event brief"
              : "Create my celebration"}
          <ArrowRight size={15} />
        </Button>
      </div>
    </form>
  );
}
