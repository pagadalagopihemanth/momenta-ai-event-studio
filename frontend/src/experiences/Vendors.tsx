import { useState } from "react";
import type { FormEvent } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Check,
  ShieldCheck,
  Download,
  Utensils,
  Camera,
  Flower2,
  Music,
  Mail,
  Car,
  Building2,
  Heart,
  Save,
  Plus,
} from "lucide-react";
import type { Vendor } from "../types";
import { money } from "../api";
import { Button, Badge, Modal } from "../components/ui";
import { SectionHead } from "../components/layout";
import type { BaseProps } from "./shared";
import { ExportButton } from "../components/ExportButton";

const vendorIcons: Record<string, typeof Sparkles> = {
  Venue: Building2,
  Catering: Utensils,
  Decorations: Flower2,
  Photography: Camera,
  Entertainment: Music,
  Invitations: Mail,
  Transportation: Car,
  Accommodation: Building2,
};

export function Vendors({ plan: p, busy, save }: BaseProps) {
  const [filter, setFilter] = useState("All vendors"),
    [editing, setEditing] = useState<{ index: number; vendor: Vendor } | null>(
      null,
    ),
    [error, setError] = useState("");
  const list = p.vendors
    .map((v, index) => ({ ...v, index }))
    .filter(
      (v) =>
        filter === "All vendors" ||
        (filter === "High priority"
          ? v.priority === "High"
          : v.status === filter),
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await save(`/plans/${p.id}/vendors`, {
        revision: p.revision,
        vendors:
          editing.index === -1
            ? [...p.vendors, editing.vendor]
            : p.vendors.map((v, i) =>
                i === editing.index ? editing.vendor : v,
              ),
      });
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="page-enter">
      <SectionHead
        eyebrow="GOOD PEOPLE. GREAT CELEBRATIONS."
        title="The people behind the magic."
        description="One calm workspace for every quote, contact and conversation."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setError("");
              setEditing({
                index: -1,
                vendor: {
                  category: "Other services",
                  estimated: 0,
                  status: "Research",
                  priority: "Medium",
                  notes: "",
                  contact: "",
                },
              });
            }}
          >
            <Plus size={15} />
            Add vendor requirement
          </Button>
        }
      />
      <div className="vendor-summary">
        <div>
          <strong>{p.vendors.length}</strong>
          <span>Vendor categories</span>
        </div>
        <div>
          <strong>
            {p.vendors.filter((v) => v.status === "Booked").length}
          </strong>
          <span>Confirmed bookings</span>
        </div>
        <div>
          <strong>
            {p.vendors.filter((v) => v.status === "Shortlisted").length}
          </strong>
          <span>On the shortlist</span>
        </div>
        <div>
          <strong>
            {money(
              p.vendors.reduce((s, v) => s + v.estimated, 0),
              p.event.currency,
            )}
          </strong>
          <span>Total vendor allowances</span>
        </div>
      </div>
      <div className="filter-row" role="group" aria-label="Filter vendors">
        {[
          "All vendors",
          "Research",
          "Contacted",
          "Shortlisted",
          "Booked",
          "High priority",
        ].map((f) => (
          <button
            className={"filter-chip " + (filter === f ? "active" : "")}
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="vendor-grid">
        {list.map((v) => {
          const Icon = vendorIcons[v.category] || Sparkles;
          return (
            <article className="panel vendor-card" key={v.index}>
              <div className="vendor-card-top">
                <span className="vendor-icon">
                  <Icon size={23} />
                </span>
                <Badge
                  tone={
                    v.status === "Booked"
                      ? "sage"
                      : v.status === "Shortlisted"
                        ? "purple"
                        : "neutral"
                  }
                >
                  {v.status === "Booked" && <Check size={11} />} {v.status}
                </Badge>
              </div>
              <h2>{v.category}</h2>
              <p className="vendor-role">
                {v.contact || "Your perfect match is still out there."}
              </p>
              <div className="vendor-amount">
                <span>ESTIMATED ALLOWANCE</span>
                <strong>{money(v.estimated, p.event.currency)}</strong>
              </div>
              <p className="vendor-notes">
                {v.notes || "Add quote details, contract notes and next steps."}
              </p>
              <div className="vendor-card-bottom">
                <Badge tone={v.priority === "High" ? "sand" : "neutral"}>
                  {v.priority} priority
                </Badge>
                <button
                  className="text-link"
                  onClick={() => {
                    setError("");
                    setEditing({
                      index: v.index,
                      vendor: {
                        category: v.category,
                        estimated: v.estimated,
                        status: v.status,
                        priority: v.priority,
                        notes: v.notes,
                        contact: v.contact,
                      },
                    });
                  }}
                >
                  Manage details <ArrowUpRight size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {list.length === 0 && (
        <div className="panel empty">
          <Heart size={20} />
          No vendor requirements in this view. Your shortlist will grow here.
        </div>
      )}
      <div className="context-note">
        <ShieldCheck size={17} />
        <p>
          These are service requirements and illustrative allowances, not actual
          businesses or verified quotes. Contacts and booking status are
          supplied by you. Vendor allowances are separate from recorded actual
          expenses.
        </p>
        <ExportButton className="text-link" planId={p.id} kind="vendors">
          Export checklist
          <Download size={13} />
        </ExportButton>
      </div>
      <Modal
        title={
          editing?.index === -1
            ? "One more piece of the celebration."
            : `${editing?.vendor.category || "Vendor"} · the details`
        }
        description="Add verified contact information, a status and your own notes. No external vendor is contacted."
        open={!!editing}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form onSubmit={(e) => void submit(e)} className="form-grid">
            <label className="span-2">
              Service category
              <input
                required
                maxLength={100}
                value={editing.vendor.category}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    vendor: { ...editing.vendor, category: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Estimated budget · {p.event.currency}
              <input
                required
                type="number"
                min={0}
                max={10000000000}
                step="0.01"
                value={editing.vendor.estimated / 100}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    vendor: {
                      ...editing.vendor,
                      estimated: Math.round(Number(e.target.value) * 100),
                    },
                  })
                }
              />
            </label>
            <label>
              Booking status
              <select
                value={editing.vendor.status}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    vendor: {
                      ...editing.vendor,
                      status: e.target.value as Vendor["status"],
                    },
                  })
                }
              >
                {["Research", "Contacted", "Shortlisted", "Booked"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={editing.vendor.priority}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    vendor: {
                      ...editing.vendor,
                      priority: e.target.value as Vendor["priority"],
                    },
                  })
                }
              >
                {["High", "Medium", "Low"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Contact · provided by you
              <input
                maxLength={500}
                value={editing.vendor.contact}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    vendor: { ...editing.vendor, contact: e.target.value },
                  })
                }
                placeholder="Name, email or phone"
              />
            </label>
            <label className="span-2">
              Notes & next steps
              <textarea
                maxLength={2000}
                value={editing.vendor.notes}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    vendor: { ...editing.vendor, notes: e.target.value },
                  })
                }
              />
            </label>
            {error && (
              <div className="alert error span-2" role="alert">
                {error}
              </div>
            )}
            <Button className="span-2" disabled={busy}>
              <Save size={15} />
              Save vendor details
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
