import { useState } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Send,
  CheckCheck,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Users,
  Utensils,
  Music,
  Car,
  Palette,
  LoaderCircle,
  Save,
  Plus,
  Wallet,
  RefreshCw,
  Pencil,
} from "lucide-react";
import type { Plan, Proposal, Suggestions } from "../types";
import { request, money, dateLabel } from "../api";
import { Button, Badge, Modal } from "../components/ui";
import { SectionHead, PanelHead } from "../components/layout";
import type { BaseProps, Preview } from "./shared";
import { useAI } from "../components/AIContext";

export function PlanningStudio({
  plan: p,
  busy,
  save,
  onPreview,
  onEdit,
}: { onPreview: Preview; onEdit: () => void } & BaseProps) {
  const ai = useAI();
  const [message, setMessage] = useState(""),
    [thinking, setThinking] = useState(false),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  const prompts = [
    "What tasks are still pending?",
    "Reduce my decoration budget by 20%.",
    "Suggest a traditional Telugu wedding menu.",
    "Create a backup plan for outdoor rain.",
    "Make this birthday party more kid-friendly.",
    "What if I invite 50 more guests?",
  ];
  async function send(text: string) {
    if (!text.trim() || thinking) return;
    setMessage("");
    setError("");
    setThinking(true);
    setMessages((ms) => [...ms, { role: "user", content: text }]);
    try {
      if (ai.mode === "live") {
        const result = await ai.run(p, "copilot", {
          instruction: text,
          history: messages
            .slice(-4)
            .map((m) => ({ ...m, content: m.content.slice(0, 180) })),
        });
        setMessages((ms) => [
          ...ms,
          { role: "assistant", content: result.answer },
        ]);
        if (result.proposal) onPreview(result.proposal);
        return;
      }
      const result = await request<{
        answer: string;
        proposal: Proposal | null;
      }>(`/plans/${p.id}/chat`, "POST", {
        revision: p.revision,
        message: text,
      });
      setMessages((ms) => [
        ...ms,
        { role: "assistant", content: result.answer },
      ]);
      if (result.proposal) onPreview(result.proposal);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setThinking(false);
    }
  }
  async function generate() {
    setThinking(true);
    setError("");
    try {
      if (ai.mode === "live") {
        const result = await ai.run(p, "planning", {
          instruction:
            "Generate a personalized complete event plan reflecting my saved brief, culture, dietary needs, priorities and budget. Preserve Python amounts and deadlines.",
        });
        if (result.proposal) onPreview(result.proposal);
        return;
      }
      onPreview(
        await request<Proposal>(`/plans/${p.id}/generate`, "POST", {
          revision: p.revision,
          message: "Refresh the event plan from the saved brief.",
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setThinking(false);
    }
  }
  return (
    <div className="page-enter">
      <SectionHead
        eyebrow="IDEAS INTO SOMETHING WONDERFUL"
        title="Your imagination. A little direction."
        description="A thoughtful space to shape the celebration you have in mind."
        action={
          <Button variant="secondary" onClick={onEdit}>
            <Pencil size={15} />
            Edit event brief
          </Button>
        }
      />
      <div className="studio-grid">
        <section className="panel chat-panel">
          <div className="chat-title">
            <span className="studio-spark">
              <Sparkles size={22} />
            </span>
            <div>
              <h2>Your planning partner</h2>
              <p>Context-aware · Connected to {p.event.name}</p>
            </div>
            <Badge tone={ai.mode === "live" ? "purple" : "sage"}>
              {ai.mode === "live" ? "LIVE AI" : "OFFLINE DEMO"}
            </Badge>
          </div>
          <div className="chat-body" aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="welcome-stars">✦</div>
                <h2>
                  A great celebration starts
                  <br />
                  with a little conversation.
                </h2>
                <p>
                  Let’s find ideas, simplify the details and make room for what
                  matters to you.
                </p>
                <div className="prompt-grid">
                  {prompts.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => void send(prompt)}
                      disabled={thinking}
                    >
                      <Sparkles size={13} />
                      <span>{prompt}</span>
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div className={"chat-message " + m.role} key={i}>
                  <span className="message-avatar">
                    {m.role === "assistant" ? <Sparkles size={16} /> : "You"}
                  </span>
                  <p>{m.content}</p>
                </div>
              ))
            )}
            {thinking && (
              <div className="thinking">
                <LoaderCircle size={15} className="spin" />
                Finding a thoughtful next step…
              </div>
            )}
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(message);
            }}
            className="chat-composer"
          >
            <label className="sr-only" htmlFor="copilot-message">
              Message your planning partner
            </label>
            <textarea
              id="copilot-message"
              value={message}
              maxLength={ai.mode === "live" ? 1000 : 2000}
              rows={2}
              placeholder="A new idea? A change of plans? Let’s work it out…"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(message);
                }
              }}
            />
            <button
              className="send-button"
              type="submit"
              disabled={thinking || !message.trim()}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </form>
          <div className="chat-disclaimer">
            <ShieldCheck size={12} />
            {ai.mode === "live"
              ? "Live model responses require separate paid-request approval. Suggestions are unverified; changes need confirmation."
              : "Offline intent-based assistant. Suggestions need review. Changes always need your confirmation."}
          </div>
          <div className="extra-prompts">
            {prompts.slice(4).map((prompt) => (
              <button
                key={prompt}
                onClick={() => void send(prompt)}
                disabled={thinking}
              >
                {prompt}
                <Plus size={12} />
              </button>
            ))}
          </div>
        </section>
        <div className="studio-side">
          <section className="brief-card">
            <Badge>THE CELEBRATION BRIEF</Badge>
            <h2>{p.event.name}</h2>
            <div className="brief-meta">
              <span>
                <MapPin size={14} />
                {p.event.city}
              </span>
              <span>
                <Users size={14} />
                {p.event.guests} guests
              </span>
              <span>
                <Wallet size={14} />
                {money(p.event.budget, p.event.currency)}
              </span>
              <span>
                <CalendarDays size={14} />
                {dateLabel(p.event.date)}
              </span>
            </div>
            <div className="brief-divider" />
            <small>THE FEELING</small>
            <p>{p.event.theme}</p>
            <small>WHAT MATTERS</small>
            <div className="tag-list">
              {p.event.priorities.map((pr) => (
                <Badge key={pr}>{pr}</Badge>
              ))}
            </div>
            <small>PERSONAL PREFERENCES</small>
            <p>
              {p.event.preferences ||
                "Add dietary, cultural and accessibility needs in your brief."}
            </p>
            <Button
              variant="secondary"
              onClick={() => void generate()}
              disabled={thinking}
            >
              <RefreshCw size={14} />
              {ai.mode === "live"
                ? "Generate AI event plan"
                : "Generate offline event plan"}
            </Button>
            <span className="quiet">
              {ai.mode === "live"
                ? "Structured OpenAI suggestions, reviewed before saving. Python keeps budget and task state intact."
                : "Uses offline templates. Budget and task state stay intact."}
            </span>
          </section>
          <section className="panel">
            <PanelHead
              title="From thought to plan"
              action={
                <button className="text-link" onClick={() => setEditing(true)}>
                  <Pencil size={13} />
                  Edit
                </button>
              }
            />
            <p className="plan-summary">{p.suggestions.overview}</p>
            <div className="mini-recommendation">
              <Sparkles size={15} />
              <p>
                {p.suggestions.next_actions[0] ||
                  "Add a next action to your plan."}
              </p>
            </div>
          </section>
        </div>
      </div>
      <section className="plan-sections">
        <PanelHead
          title="Your celebration, taking shape"
          subtitle="Personal suggestions from the existing offline planner."
          action={
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={14} />
              Edit suggestions
            </Button>
          }
        />
        <div className="suggestion-grid">
          {(
            [
              "themes",
              "activities",
              "food",
              "logistics",
              "risks",
              "next_actions",
            ] as const
          ).map((section, i) => (
            <section className="panel" key={section}>
              <span className={"suggestion-icon tone-" + i}>
                {
                  [
                    <Palette />,
                    <Music />,
                    <Utensils />,
                    <Car />,
                    <ShieldCheck />,
                    <CheckCheck />,
                  ][i]
                }
              </span>
              <h3>
                {section
                  .replace("_", " ")
                  .replace(/^./, (x) => x.toUpperCase())}
              </h3>
              <ul>
                {p.suggestions[section].map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
      <Modal
        title="Make the plan yours"
        description="Edit the written suggestions. Each new line becomes a separate idea. Financial totals remain in Budget Studio."
        open={editing}
        onClose={() => setEditing(false)}
        wide
      >
        <SuggestionEditor
          plan={p}
          busy={busy}
          onSave={async (suggestions) => {
            await save(`/plans/${p.id}/suggestions`, {
              revision: p.revision,
              suggestions,
            });
            setEditing(false);
          }}
        />
      </Modal>
    </div>
  );
}

function SuggestionEditor({
  plan,
  busy,
  onSave,
}: {
  plan: Plan;
  busy: boolean;
  onSave: (s: Suggestions) => Promise<void>;
}) {
  const [suggestions, setSuggestions] = useState(plan.suggestions),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(suggestions).catch((e) => setError(e.message));
      }}
    >
      <div className="form-grid">
        <label className="span-2">
          Overview
          <textarea
            value={suggestions.overview}
            maxLength={6000}
            onChange={(e) =>
              setSuggestions((s) => ({ ...s, overview: e.target.value }))
            }
          />
        </label>
        {(
          [
            "themes",
            "activities",
            "food",
            "logistics",
            "risks",
            "next_actions",
            "ideas",
          ] as const
        ).map((key) => (
          <label key={key}>
            {key.replace("_", " ")}
            <textarea
              value={suggestions[key].join("\n")}
              maxLength={6000}
              onChange={(e) =>
                setSuggestions((s) => ({
                  ...s,
                  [key]: e.target.value.split("\n"),
                }))
              }
            />
          </label>
        ))}
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <div className="modal-actions">
        <Button disabled={busy}>
          <Save size={15} />
          Save suggestions
        </Button>
      </div>
    </form>
  );
}
