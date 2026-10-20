export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  timeout = 20000,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    let message = "Unable to reach your planning studio.";
    try {
      const data = await response.json();
      message =
        typeof data.detail === "string"
          ? data.detail
          : data.detail?.map((e: { msg: string }) => e.msg).join("; ") ||
            message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function fetchExport(planId: string, kind: string) {
  if (!["pdf", "budget", "tasks", "vendors"].includes(kind))
    throw new Error("Unknown export type.");
  const response = await fetch(
    `/api/plans/${encodeURIComponent(planId)}/exports/${kind}`,
    { signal: AbortSignal.timeout(30000) },
  );
  if (!response.ok) {
    let detail = "Export failed. Your plan is unchanged. Try again.";
    try {
      const data = await response.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {}
    throw new Error(detail);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith(kind === "pdf" ? "application/pdf" : "text/csv"))
    throw new Error(
      "The server returned an unexpected file type. No file was downloaded.",
    );
  const filename = response.headers
    .get("content-disposition")
    ?.match(/filename="([a-zA-Z0-9._-]+)"/)?.[1];
  if (!filename || !filename.endsWith(kind === "pdf" ? ".pdf" : ".csv"))
    throw new Error("The export has no valid filename. Please try again.");
  const blob = await response.blob();
  if (!blob.size)
    throw new Error("The export is empty. No file was downloaded.");
  if (kind === "pdf" && (await blob.slice(0, 5).text()) !== "%PDF-")
    throw new Error("The PDF is invalid. No file was downloaded.");
  return { blob, filename };
}
export function money(
  amount: number,
  currency = "INR",
  decimals = amount % 100 === 0 ? 0 : 2,
) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: decimals,
  }).format(amount / 100);
}
export function dateLabel(
  value: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-IN", options);
}
