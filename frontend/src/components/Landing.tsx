import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Wordmark } from "./Brand";
import type { Event } from "../types";

const occasions: {
  kind: Event["kind"];
  label: string;
  copy: string;
  image: string;
  alt: string;
  number: string;
}[] = [
  {
    kind: "Wedding",
    label: "The beginning of forever.",
    copy: "Weddings",
    image: "wedding",
    alt: "Flowers and candlelight arranged for an outdoor wedding reception",
    number: "01",
  },
  {
    kind: "Birthday",
    label: "Another year. All the joy.",
    copy: "Birthdays",
    image: "birthday",
    alt: "Colorful confetti for a birthday celebration",
    number: "02",
  },
  {
    kind: "Community event",
    label: "Good people. Great ideas.",
    copy: "Community events",
    image: "meetup",
    alt: "People gathered around a table for a community workshop",
    number: "03",
  },
];
export function Landing({
  onEnter,
  onCreate,
  onDemo,
}: {
  onEnter: () => void;
  onCreate: (kind?: Event["kind"]) => void;
  onDemo: () => void;
}) {
  const reduced = useReducedMotion();
  const enter = {
    initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
  };
  return (
    <div className="landing">
      <a className="skip-link" href="#occasions">
        Skip to occasions
      </a>
      <header className="landing-nav">
        <a href="#home" aria-label="Momenta home">
          <Wordmark />
        </a>
        <span className="landing-subtitle">AI EVENT STUDIO</span>
        <button className="landing-enter" onClick={onEnter}>
          Open your studio <ArrowUpRight size={16} />
        </button>
      </header>
      <main id="home" className="landing-main">
        <section className="landing-hero">
          <motion.div className="landing-copy" {...enter}>
            <span className="landing-kicker">
              <span className="status-dot" /> A LITTLE INTELLIGENCE. A LOT OF
              POSSIBILITY.
            </span>
            <h1>
              Make moments
              <br />
              <em>happen.</em>
              <span className="hero-asterisk" aria-hidden="true">
                ✳
              </span>
            </h1>
            <p>
              For the days you’ll always remember.
              <br />
              Bring your ideas, your people, and your budget.
              <br />
              We’ll help you bring it all together.
            </p>
            <div className="landing-cta">
              <button className="button primary" onClick={() => onCreate()}>
                Plan with AI <ArrowUpRight size={20} />
              </button>
              <button className="demo-play" onClick={onDemo}>
                <span>
                  <Play size={12} fill="currentColor" />
                </span>
                Take the 2-minute tour
              </button>
            </div>
            <div className="landing-trust">
              <ShieldCheck size={15} />
              <span>
                Offline demo ready. Live AI is optional.
                <br />
                <strong>You approve every AI request and plan change.</strong>
              </span>
            </div>
          </motion.div>
          <motion.div
            className="landing-art"
            {...enter}
            transition={{ duration: 0.65, delay: reduced ? 0 : 0.12 }}
          >
            <img
              className="landing-hero-photo"
              src="/images/wedding.webp"
              alt="A wedding table with white flowers, greenery and glassware"
              fetchPriority="high"
              width="1200"
              height="1500"
            />
            <span className="photo-index">THE MOMENTS THAT MATTER / 01</span>
            <div className="image-caption">
              <span>A beautiful beginning.</span>
              <span>Bengaluru, with love.</span>
            </div>
            <div className="landing-plan-note">
              <span className="note-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <small>FROM IDEA TO OCCASION</small>
                <strong>A plan with you at the heart.</strong>
                <span>Budget. Timeline. A thousand little details.</span>
              </div>
              <ArrowUpRight size={18} />
            </div>
          </motion.div>
        </section>
        <div className="landing-manifesto">
          <span>
            LESS OVERWHELM.
            <br />
            MORE LOOKING FORWARD.
          </span>
          <p>
            Big feelings.
            <br />
            <em>Thoughtful little details.</em>
          </p>
          <span className="manifesto-end">
            One space for the plan.
            <br />
            More space for the moment.
          </span>
        </div>
        <section id="occasions" className="occasion-section">
          <div className="occasion-heading">
            <div>
              <span className="eyebrow">EVERY OCCASION STARTS SOMEWHERE</span>
              <h2>What are we celebrating?</h2>
            </div>
            <p>
              Choose your moment.
              <br />
              Make the rest feel effortless.
            </p>
          </div>
          <div className="occasion-grid">
            {occasions.map((o, i) => (
              <motion.button
                {...enter}
                transition={{ duration: 0.4, delay: reduced ? 0 : i * 0.07 }}
                key={o.kind}
                className="occasion-card"
                onClick={() => onCreate(o.kind)}
                aria-label={`Plan a ${o.copy.toLowerCase() === "weddings" ? "wedding" : o.kind.toLowerCase()}`}
              >
                <div className="occasion-photo">
                  <img
                    src={`/images/${o.image}.webp`}
                    alt={o.alt}
                    loading="lazy"
                    width="600"
                    height="450"
                  />
                  <span>{o.number}</span>
                  <i>
                    <ArrowUpRight size={22} />
                  </i>
                </div>
                <div className="occasion-caption">
                  <h3>{o.copy}</h3>
                  <p>{o.label}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
        <section className="landing-closing">
          <div>
            <span className="eyebrow">YOUR NEXT GREAT MEMORY</span>
            <h2>
              Less planning.
              <br />
              <em>More possibility.</em>
            </h2>
          </div>
          <button className="button primary" onClick={() => onCreate()}>
            Let’s make it happen <ArrowRight size={19} />
          </button>
          <p>
            Real budgets. Personal ideas.
            <br />A plan you’re always in control of.
          </p>
        </section>
      </main>
      <footer className="landing-footer">
        <Wordmark />
        <span>Make moments happen.</span>
        <span>Built for PromptWars Virtual · Celebration & Event Planner</span>
      </footer>
    </div>
  );
}
