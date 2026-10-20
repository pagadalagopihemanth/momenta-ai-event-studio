import { useState } from "react";
import type { ReactNode } from "react";
import { fetchExport } from "../api";

export function ExportButton({
  planId,
  kind,
  children,
  className = "button secondary",
  onReady,
}: {
  planId: string;
  kind: string;
  children: ReactNode;
  className?: string;
  onReady?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const { blob, filename } = await fetchExport(planId, kind);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.append(link);
      link.click();
      link.remove();
      // Keep the object URL alive long enough for browsers to consume it.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setStatus(`${filename} is ready. Check your browser downloads.`);
      onReady?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="export-control">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() => void download()}
        aria-busy={busy}
      >
        {busy ? "Preparing download…" : children}
      </button>
      {error && (
        <p className="export-error" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="export-success" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
