// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ExportButton } from "./ExportButton";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("controlled browser exports", () => {
  it("shows server errors without navigating or reporting a download", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Celebration not found" }), {
            status: 404,
          }),
        ),
    );
    render(
      <ExportButton planId="missing" kind="pdf">
        Download PDF
      </ExportButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Celebration not found",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("creates a browser download with the server filename for valid PDF content", async () => {
    const create = vi.fn().mockReturnValue("blob:verified-pdf");
    vi.spyOn(URL, "createObjectURL").mockImplementation(create);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("celebrai-plan.pdf");
        expect(this.href).toBe("blob:verified-pdf");
      });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("%PDF-1.7\ncontent\n%%EOF", {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'attachment; filename="celebrai-plan.pdf"',
            },
          }),
        ),
    );
    render(
      <ExportButton planId="event" kind="pdf">
        Download PDF
      </ExportButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "celebrai-plan.pdf is ready. Check your browser downloads.",
    );
  });
});
