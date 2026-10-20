import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Sparkles, ShieldCheck, RefreshCw, LoaderCircle } from "lucide-react";
import { Modal, Button, Badge } from "./ui";
import { request } from "../api";
import type { AIResult, Workflow, AIStatus, Plan } from "../types";

interface Pending {
  plan: Plan;
  workflow: Workflow;
  data: Record<string, unknown>;
  id: string;
  resolve: (result: AIResult) => void;
  reject: (reason: Error) => void;
}
interface AIContextType {
  mode: "offline" | "live";
  status: AIStatus | null;
  run: (
    plan: Plan,
    workflow: Workflow,
    data?: Record<string, unknown>,
  ) => Promise<AIResult>;
  setMode: (mode: "offline" | "live") => void;
  refresh: () => Promise<void>;
  setup: () => void;
}
const Context = createContext<AIContextType | null>(null);
export function useAI() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("AI controls unavailable");
  return ctx;
}
export function AIProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"offline" | "live">("offline"),
    [status, setStatus] = useState<AIStatus | null>(null),
    [pending, setPending] = useState<Pending | null>(null),
    [approved, setApproved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [settings, setSettings] = useState(false);
  const active = useRef(false);
  async function refresh() {
    try {
      setStatus(await request<AIStatus>("/ai/status"));
    } catch {
      setStatus(null);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  function run(
    plan: Plan,
    workflow: Workflow,
    data: Record<string, unknown> = {},
  ) {
    if (active.current)
      return Promise.reject(
        new Error("An AI request is already awaiting approval or running."),
      );
    if (!status?.ready)
      return Promise.reject(
        new Error("Live AI is not ready. Open AI setup or use Offline Demo."),
      );
    active.current = true;
    setError("");
    setApproved(false);
    return new Promise<AIResult>((resolve, reject) =>
      setPending({
        plan,
        workflow,
        data,
        id: crypto.randomUUID(),
        resolve,
        reject,
      }),
    );
  }
  function cancel() {
    if (busy) return;
    pending?.reject(new Error("AI request cancelled. No paid call was made."));
    setPending(null);
    active.current = false;
  }
  async function submit() {
    if (!pending || !approved || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await request<AIResult>(
        `/plans/${pending.plan.id}/ai/${pending.workflow}`,
        "POST",
        {
          ...pending.data,
          revision: pending.plan.revision,
          approved: true,
          request_id: pending.id,
        },
        90000,
      );
      pending.resolve(result);
      setPending(null);
      active.current = false;
    } catch (e) {
      const message = (e as Error).message;
      pending.reject(new Error(message));
      setPending(null);
      active.current = false;
      setError(message);
    } finally {
      setBusy(false);
      setApproved(false);
      void refresh();
    }
  }
  return (
    <Context.Provider
      value={{
        mode,
        status,
        run,
        setMode,
        refresh,
        setup: () => setSettings(true),
      }}
    >
      {children}
      {error && (
        <div className="ai-global-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss AI error"
          >
            ×
          </button>
        </div>
      )}
      <Modal
        title="Approve this Live AI request"
        description="This is a potentially paid OpenAI API request. Choosing Live AI mode alone never starts a call."
        open={!!pending}
        onClose={cancel}
      >
        <Badge>LIVE AI · {pending?.workflow.toUpperCase()}</Badge>
        <p className="modal-copy">
          Send the event brief, budgets, tasks, vendor notes and relevant
          conversation to OpenAI for this request. Vendor contact fields are
          removed. API keys stay on the Python server.
        </p>
        <div className="context-note">
          <ShieldCheck size={18} />
          <p>
            One request, including at most one SDK retry. Up to 2,200 output
            tokens; 25-second timeout per attempt. {status?.remaining} of{" "}
            {status?.daily_limit} requests remain today. Failed attempts count.
            This is a usage limit, not a guaranteed monetary cap.
          </p>
        </div>
        <p className="quiet">
          AI results are unverified suggestions. Applying a proposed plan
          requires a separate confirmation. Critic reviews do not alter your
          readiness score.
        </p>
        <label className="confirm-check">
          <input
            type="checkbox"
            checked={approved}
            disabled={busy}
            onChange={(e) => setApproved(e.target.checked)}
          />
          <span>
            I explicitly approve this potentially paid request and sending this
            event context to OpenAI.
          </span>
        </label>
        <div className="modal-actions">
          <Button variant="secondary" disabled={busy} onClick={cancel}>
            Cancel without calling AI
          </Button>
          <Button disabled={!approved || busy} onClick={() => void submit()}>
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Sparkles size={15} />
            )}{" "}
            {busy ? "Request in progress…" : "Approve & request Live AI"}
          </Button>
        </div>
      </Modal>
      <Modal
        title="AI mode & server configuration"
        description="Offline Demo works without a key. Live AI reuses the original Python OpenAI provider."
        open={settings}
        onClose={() => setSettings(false)}
      >
        <Badge tone={status?.ready ? "sage" : "sand"}>
          {status?.ready ? "LIVE AI READY" : "OFFLINE DEMO AVAILABLE"}
        </Badge>
        <p className="modal-copy">
          {status?.message ||
            "Cannot read the AI server status. Check the local Python server."}
        </p>
        <p className="quiet">
          Set these environment variables on the server, then restart Python.
          Never put a key in frontend files or Vite environment variables.
        </p>
        <pre className="setup-code">
          CELEBRAI_LIVE_ENABLED=true{"\n"}OPENAI_API_KEY=&lt;server secret&gt;
          {"\n"}OPENAI_MODEL=&lt;structured-output model in your account&gt;
          {"\n"}CELEBRAI_WEB_AI_DAILY_LIMIT=5
        </pre>
        <p className="quiet">
          Daily usage is stored in SQLite across restarts; each workflow also
          retains the original three-call process limit. Account spending limits
          should be configured separately. ChatGPT subscriptions do not include
          API credits by assumption.
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} />
            Refresh status
          </Button>
          <Button onClick={() => setSettings(false)}>Done</Button>
        </div>
      </Modal>
    </Context.Provider>
  );
}
export function AIControls() {
  const ai = useAI();
  return (
    <div className="ai-controls">
      <label className="sr-only" htmlFor="ai-mode">
        AI mode
      </label>
      <select
        id="ai-mode"
        value={ai.mode}
        onChange={(e) => ai.setMode(e.target.value as "offline" | "live")}
      >
        <option value="offline">Offline Demo</option>
        <option value="live" disabled={!ai.status?.ready}>
          Live AI{!ai.status?.ready ? " · unavailable" : ""}
        </option>
      </select>
      <button type="button" className="text-link" onClick={ai.setup}>
        AI setup
      </button>
    </div>
  );
}
