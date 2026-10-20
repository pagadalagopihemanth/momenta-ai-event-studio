import { afterEach, describe, it, expect, vi } from "vitest";
import { money, dateLabel, request, fetchExport } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("Python API boundary", () => {
  it("serializes saved minor-unit values without changing them", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ revision: 2 }) });
    vi.stubGlobal("fetch", fetch);
    expect(
      await request("/plans/id/budget", "PUT", {
        revision: 1,
        rows: [{ actual: 1250000 }],
      }),
    ).toEqual({ revision: 2 });
    expect(fetch.mock.calls[0][0]).toBe("/api/plans/id/budget");
    expect(JSON.parse(fetch.mock.calls[0][1].body).rows[0].actual).toBe(
      1250000,
    );
  });
  it("surfaces revision conflicts rather than reporting a save", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Reload before saving." }),
      }),
    );
    await expect(request("/plans/id/budget", "PUT", {})).rejects.toThrow(
      "Reload before saving.",
    );
  });
  it("shows Pydantic field validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: [{ msg: "Budget must be positive" }] }),
      }),
    );
    await expect(request("/plans", "POST", {})).rejects.toThrow(
      "Budget must be positive",
    );
  });
});
describe("export response validation", () => {
  it("rejects an invalid PDF signature", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("invalid", {
            headers: {
              "content-type": "application/pdf",
              "content-disposition": 'attachment; filename="celebrai-plan.pdf"',
            },
          }),
        ),
    );
    await expect(fetchExport("event", "pdf")).rejects.toThrow("PDF is invalid");
  });
  it("rejects HTML errors disguised as a successful file response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>Error</html>", {
            headers: { "content-type": "text/html" },
          }),
        ),
    );
    await expect(fetchExport("event", "pdf")).rejects.toThrow(
      "unexpected file type",
    );
  });
  it("rejects empty CSVs and incorrect filenames", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("", {
            headers: {
              "content-type": "text/csv",
              "content-disposition":
                'attachment; filename="celebrai-budget.csv"',
            },
          }),
        ),
    );
    await expect(fetchExport("event", "budget")).rejects.toThrow("empty");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("a,b", {
            headers: {
              "content-type": "text/csv",
              "content-disposition": 'attachment; filename="wrong.pdf"',
            },
          }),
        ),
    );
    await expect(fetchExport("event", "budget")).rejects.toThrow(
      "valid filename",
    );
  });
});
describe("localized presentation", () => {
  it("formats rupees with Indian grouping", () =>
    expect(money(90000000)).toBe("₹9,00,000"));
  it("preserves cents when requested", () =>
    expect(money(125025, "USD", 2)).toBe("$1,250.25"));
  it("does not shift calendar dates through UTC", () =>
    expect(
      dateLabel("2027-02-18", { day: "numeric", month: "short" }),
    ).toContain("18"));
});
