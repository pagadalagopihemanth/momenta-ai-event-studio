import { useState } from "react";
import {
  Sparkles,
  ArrowUpRight,
  MapPin,
  Bookmark,
  Palette,
} from "lucide-react";
import { money, request } from "../api";
import { useAI } from "../components/AIContext";
import type { Proposal } from "../types";
import { Button, Badge, Modal } from "../components/ui";
import { SectionHead, PanelHead } from "../components/layout";
import type { BaseProps } from "./shared";

const inspirations = [
  {
    name: "Lavender & linen",
    category: "Themes",
    image: "wedding.jpg",
    palette: ["#9D88AA", "#D8C6C2", "#E8E0CF", "#9CA58C"],
    feeling: "Soft florals. Natural textures. A little romance.",
    idea: "Moodboard · Lavender & linen: muted violet flowers, linen table settings and reusable glass votives. Ask decorators for seasonal, locally available alternatives.",
  },
  {
    name: "A garden kind of magic",
    category: "Decor",
    image: "garden.jpg",
    palette: ["#8A9B7D", "#D9BCA5", "#F0E9DA", "#BDA3AE"],
    feeling: "Bring the outdoors in, thoughtfully.",
    idea: "Moodboard · Garden magic: potted greenery, seasonal flowers and reusable fabric backdrops. Confirm allergy needs, sight lines and accessible paths.",
  },
  {
    name: "Little sparks of joy",
    category: "Experiences",
    image: "birthday.jpg",
    palette: ["#C7ADCA", "#DDB292", "#EBC96F", "#87A69B"],
    feeling: "Playful details for your favorite people.",
    idea: "Moodboard · Little sparks of joy: a guest memory station, age-appropriate games and a photo corner. Confirm supervision, allergies and opt-in photography.",
  },
  {
    name: "Ideas, shared beautifully",
    category: "Experiences",
    image: "meetup.jpg",
    palette: ["#A996B0", "#9AAB9A", "#E2D5BE", "#888F9E"],
    feeling: "Make room for meaningful connections.",
    idea: "Moodboard · Ideas shared: lightning talks, facilitated networking and a quiet conversation corner. Check Wi-Fi, AV, seating and accessible participation.",
  },
  {
    name: "Warm light, lasting memories",
    category: "Decor",
    image: "wedding.jpg",
    palette: ["#C2A689", "#E2CDA8", "#AF9BAA", "#848D77"],
    feeling: "An intimate glow. An unforgettable evening.",
    idea: "Moodboard · Warm light: use venue-approved flameless candles, shared floral installations and a clear photography schedule. Keep exits and walkways unobstructed.",
  },
  {
    name: "Less waste. More wonder.",
    category: "Sustainable",
    image: "garden.jpg",
    palette: ["#8E9D7C", "#B7C0AA", "#E1D6BD", "#B9A294"],
    feeling: "Beautiful celebrations can tread lightly.",
    idea: "Moodboard · Less waste: digital RSVPs, refillable water stations, rented decor and useful local return gifts. Arrange waste sorting with the venue.",
  },
];

export function Inspiration({
  plan: p,
  busy,
  save,
  onPreview,
}: BaseProps & { onPreview: (p: Proposal) => void }) {
  const ai = useAI();
  const [generating, setGenerating] = useState(false);
  async function generate() {
    setGenerating(true);
    setError("");
    try {
      if (ai.mode === "live") {
        const r = await ai.run(p, "ideas", {
          instruction:
            "Create personalized themes, decor, food, experiences and sustainable ideas within this event budget and cultural preferences.",
        });
        if (r.proposal) onPreview(r.proposal);
      } else {
        onPreview(
          await request<Proposal>(`/plans/${p.id}/ideas/generate`, "POST", {
            revision: p.revision,
            message: "Generate personalized offline ideas",
          }),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  const [filter, setFilter] = useState("All ideas"),
    [selected, setSelected] = useState<(typeof inspirations)[number] | null>(
      null,
    ),
    [error, setError] = useState("");
  const list = inspirations.filter((c) =>
    filter === "All ideas" || filter === "Saved"
      ? filter !== "Saved" || p.suggestions.ideas.includes(c.idea)
      : c.category === filter,
  );
  async function saveCard(card: (typeof inspirations)[number]) {
    try {
      await save(
        `/plans/${p.id}/ideas`,
        { revision: p.revision, idea: card.idea },
        "POST",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="page-enter">
      <SectionHead
        eyebrow="A CELEBRATION THAT FEELS LIKE YOU"
        title="Collect a little wonder."
        description={`${p.event.theme}. ${p.event.city}. Your own kind of beautiful.`}
        action={
          <Badge tone="sand">
            <Bookmark size={12} />
            {
              inspirations.filter((c) => p.suggestions.ideas.includes(c.idea))
                .length
            }{" "}
            saved concepts
          </Badge>
        }
      />
      <div className="idea-generation-row">
        <Button disabled={busy || generating} onClick={() => void generate()}>
          <Palette size={15} />
          {generating
            ? "Preparing suggestions…"
            : ai.mode === "live"
              ? "Generate AI ideas"
              : "Generate offline ideas"}
        </Button>
        <span className="quiet">
          {ai.mode === "live"
            ? "Live AI · explicit approval before each call"
            : "Offline Demo · templates tailored to your saved brief"}
        </span>
      </div>
      <div className="inspiration-banner">
        <div>
          <Palette size={24} />
          <h2>
            Start with a feeling.
            <br />
            Let the details follow.
          </h2>
          <p>
            Reference images to spark ideas, paired with practical ways to make
            them your own.
          </p>
        </div>
        <div className="large-palette">
          {["#AD99B5", "#DAC5B5", "#EAE3D3", "#A7AF99", "#7E6B8B"].map((c) => (
            <div key={c} style={{ background: c }}>
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="filter-row" role="group" aria-label="Filter inspiration">
        {[
          "All ideas",
          "Themes",
          "Decor",
          "Experiences",
          "Sustainable",
          "Saved",
        ].map((f) => (
          <button
            key={f}
            className={"filter-chip " + (filter === f ? "active" : "")}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
          >
            {f === "Saved" && <Bookmark size={12} />} {f}
          </button>
        ))}
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <div className="mood-grid">
        {list.map((card) => (
          <article className="mood-card" key={card.name}>
            <button
              className="mood-image"
              onClick={() => setSelected(card)}
              aria-label={`Explore ${card.name}`}
            >
              <img src={"/images/" + card.image} alt={card.feeling} />
              <span className="mood-category">{card.category}</span>
              <span className="mood-explore">
                <ArrowUpRight size={18} />
              </span>
            </button>
            <div className="mood-content">
              <div>
                <h2>{card.name}</h2>
                <p>{card.feeling}</p>
              </div>
              <div className="mood-bottom">
                <div className="color-dots">
                  {card.palette.map((c) => (
                    <span style={{ background: c }} key={c} title={c} />
                  ))}
                </div>
                <button
                  className={
                    "save-idea " +
                    (p.suggestions.ideas.includes(card.idea) ? "saved" : "")
                  }
                  disabled={busy || p.suggestions.ideas.includes(card.idea)}
                  onClick={() => void saveCard(card)}
                  aria-label={`Save ${card.name}`}
                >
                  <Bookmark
                    size={14}
                    fill={
                      p.suggestions.ideas.includes(card.idea)
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {p.suggestions.ideas.includes(card.idea)
                    ? "Saved"
                    : "Save idea"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {list.length === 0 && (
        <div className="panel empty">
          <Bookmark />
          Save a concept to start building your personal inspiration board.
        </div>
      )}
      <section className="panel personal-ideas">
        <PanelHead
          title="Made for your celebration"
          subtitle="Personalized ideas from your event plan."
        />
        {p.suggestions.ideas
          .filter((i) => !i.startsWith("Moodboard"))
          .map((idea, i) => (
            <div key={i} className="personal-idea">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <p>{idea}</p>
              <Sparkles size={15} />
            </div>
          ))}
      </section>
      <p className="image-note">
        Reference photography from Unsplash. Bundled locally for offline use.
        Images do not represent booked venues or vendors.
      </p>
      <Modal
        title={selected?.name || "Your inspiration"}
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <img
              className="mood-modal-image"
              src={"/images/" + selected.image}
              alt={selected.feeling}
            />
            <div className="palette-labels">
              {selected.palette.map((c) => (
                <span key={c}>
                  <i style={{ background: c }} />
                  {c}
                </span>
              ))}
            </div>
            <p className="modal-copy">
              {selected.idea.replace("Moodboard · ", "")}
            </p>
            <div className="context-note">
              <MapPin size={16} />
              <p>
                For {p.event.guests} guests in {p.event.city}, start with a
                small focal installation and request itemized quotes within{" "}
                {money(p.event.budget, p.event.currency)}. Confirm cultural fit
                with your hosts.
              </p>
            </div>
            <Button
              className="full"
              disabled={busy || p.suggestions.ideas.includes(selected.idea)}
              onClick={() => void saveCard(selected)}
            >
              <Bookmark size={15} />
              {p.suggestions.ideas.includes(selected.idea)
                ? "Saved to your celebration"
                : "Save this concept"}
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}
