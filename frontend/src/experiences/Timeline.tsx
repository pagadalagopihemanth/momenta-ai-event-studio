import { useState } from "react";
import {
  Sparkles,
  Check,
  CheckCheck,
  ShieldCheck,
  Download,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  LockKeyhole,
  Save,
  Pencil,
  Clock3,
} from "lucide-react";
import type { Task } from "../types";
import { dateLabel } from "../api";
import { Button, Badge, Modal } from "../components/ui";
import { SectionHead } from "../components/layout";
import type { BaseProps } from "./shared";
import { ExportButton } from "../components/ExportButton";

export function Timeline({
  plan: p,
  busy,
  save,
  today,
}: { today: string } & BaseProps) {
  const [view, setView] = useState("Timeline"),
    [filter, setFilter] = useState("All tasks"),
    [editing, setEditing] = useState<Task | null>(null),
    [error, setError] = useState(""),
    [month, setMonth] = useState(
      new Date(
        (p.tasks.find((t) => !t.done)?.due || p.event.date) + "T12:00:00",
      ),
    );
  const tasks = p.tasks
    .filter(
      (t) =>
        filter === "All tasks" ||
        (filter === "Completed"
          ? t.done
          : filter === "High priority"
            ? t.priority === "High"
            : !t.done),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  async function update(task: Task) {
    setError("");
    try {
      await save(`/plans/${p.id}/tasks`, {
        revision: p.revision,
        tasks: p.tasks.map((t) => (t.id === task.id ? task : t)),
      });
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const completed = p.tasks.filter((t) => t.done).length;
  return (
    <div className="page-enter">
      <SectionHead
        eyebrow="SMALL STEPS. EXTRAORDINARY MOMENTS."
        title="Your day is coming together."
        description="From the first decision to the final detail. One thoughtful step at a time."
        action={
          <ExportButton planId={p.id} kind="tasks">
            <Download size={15} />
            Export timeline
          </ExportButton>
        }
      />
      <div className="timeline-summary">
        <div>
          <span className="metric-icon lavender">
            <CalendarDays size={18} />
          </span>
          <div>
            <strong>{dateLabel(p.event.date)}</strong>
            <small>Your celebration day</small>
          </div>
        </div>
        <div>
          <span className="metric-icon sage">
            <CheckCheck size={18} />
          </span>
          <div>
            <strong>
              {completed} of {p.tasks.length} complete
            </strong>
            <small>A little closer, every day.</small>
          </div>
        </div>
        <div className="timeline-progress">
          <div
            className="progress"
            role="progressbar"
            aria-label="Task completion"
            aria-valuenow={Math.round((completed / p.tasks.length) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: (completed / p.tasks.length) * 100 + "%" }} />
          </div>
          <span>
            {Math.round((completed / p.tasks.length) * 100)}% of the way there
          </span>
        </div>
      </div>
      <div className="view-toolbar">
        <div className="filter-row" role="group" aria-label="Filter tasks">
          {["All tasks", "Pending", "Completed", "High priority"].map((f) => (
            <button
              className={"filter-chip " + (filter === f ? "active" : "")}
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Timeline view">
          {["Timeline", "Calendar"].map((v) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v === "Timeline" ? (
                <Clock3 size={14} />
              ) : (
                <CalendarDays size={14} />
              )}{" "}
              {v}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {view === "Timeline" ? (
        <div className="milestone-list">
          {tasks.map((task, i) => {
            const blocked = task.depends_on.some(
              (d) => !p.tasks.find((t) => t.id === d)?.done,
            );
            return (
              <article
                className={"milestone " + (task.done ? "complete" : "")}
                key={task.id}
              >
                <div className="milestone-date">
                  <strong>{dateLabel(task.due, { day: "numeric" })}</strong>
                  <span>
                    {dateLabel(task.due, { month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="milestone-track">
                  <span>
                    {task.done ? (
                      <Check size={14} />
                    ) : i === 0 ? (
                      <span className="milestone-core" />
                    ) : null}
                  </span>
                </div>
                <div className="milestone-card">
                  <button
                    className="task-check"
                    aria-label={`Mark ${task.title} ${task.done ? "pending" : "complete"}`}
                    aria-pressed={task.done}
                    disabled={busy || (!task.done && blocked)}
                    onClick={() => void update({ ...task, done: !task.done })}
                  >
                    {task.done ? (
                      <CheckCircle2 size={23} />
                    ) : blocked ? (
                      <LockKeyhole size={19} />
                    ) : (
                      <Circle size={23} />
                    )}
                  </button>
                  <div>
                    <h3>{task.title}</h3>
                    <p>
                      {task.notes ||
                        "Confirm the details and keep your celebration moving forward."}
                    </p>
                    <div className="task-tags">
                      <Badge
                        tone={task.priority === "High" ? "sand" : "neutral"}
                      >
                        {task.priority} priority
                      </Badge>
                      {!task.done && task.due < today && (
                        <Badge tone="rose">Overdue</Badge>
                      )}
                      {task.done && <Badge tone="sage">Completed</Badge>}
                      {blocked && !task.done && (
                        <span className="dependency">
                          <LockKeyhole size={11} />
                          After:{" "}
                          {
                            p.tasks.find((t) => t.id === task.depends_on[0])
                              ?.title
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${task.title}`}
                    onClick={() => setEditing(task)}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel calendar">
          <div className="calendar-header">
            <h2>
              {month.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div>
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>
              <Button
                variant="ghost"
                onClick={() => setMonth(new Date(today + "T12:00:00"))}
              >
                Today
              </Button>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div className="weekday" key={day}>
                {day}
              </div>
            ))}
            {Array.from(
              {
                length:
                  (new Date(month.getFullYear(), month.getMonth(), 1).getDay() +
                    6) %
                  7,
              },
              (_, i) => (
                <div className="calendar-day blank" key={"blank" + i} />
              ),
            )}
            {Array.from(
              {
                length: new Date(
                  month.getFullYear(),
                  month.getMonth() + 1,
                  0,
                ).getDate(),
              },
              (_, i) => {
                const day = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <div
                    className={"calendar-day " + (day === today ? "today" : "")}
                    key={day}
                  >
                    <span>{i + 1}</span>
                    {tasks
                      .filter((t) => t.due === day)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setEditing(t)}
                          className={t.done ? "done" : ""}
                        >
                          {t.done && <Check size={10} />} {t.title}
                        </button>
                      ))}
                    {p.event.date === day && (
                      <div className="event-day">
                        <Sparkles size={10} />
                        Celebration day
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </section>
      )}
      {tasks.length === 0 && (
        <div className="panel empty">
          <CheckCheck />
          No tasks match this view.
        </div>
      )}
      <div className="context-note">
        <ShieldCheck size={17} />
        <p>
          Dependencies are enforced by Python. Complete earlier tasks first; to
          reopen a prerequisite, reopen its completed dependents first. Dates
          cannot extend past your event.
        </p>
      </div>
      <Modal
        title="A little detail goes a long way."
        description="Update this task’s title, due date, priority and notes. Dependencies stay intact."
        open={!!editing}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void update(editing);
            }}
            className="form-grid"
          >
            <label className="span-2">
              Task title
              <input
                required
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                required
                max={p.event.date}
                value={editing.due}
                onChange={(e) =>
                  setEditing({ ...editing, due: e.target.value })
                }
              />
            </label>
            <label>
              Priority
              <select
                value={editing.priority}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priority: e.target.value as Task["priority"],
                  })
                }
              >
                {["High", "Medium", "Low"].map((pr) => (
                  <option key={pr}>{pr}</option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Notes
              <textarea
                maxLength={2000}
                value={editing.notes}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
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
              Save task details
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
