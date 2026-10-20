// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AIProvider, AIControls, useAI } from "./AIContext";
import type { Plan } from "../types";
const plan = { id: "test-event", revision: 1 } as Plan;
function Probe() {
  const ai = useAI();
  return (
    <>
      <AIControls />
      <button
        onClick={() =>
          void ai
            .run(plan, "planning", { instruction: "Create a plan" })
            .catch(() => {})
        }
      >
        Generate test plan
      </button>
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function mockedFetch() {
  const fetch = vi
    .fn()
    .mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith("/status")
              ? {
                  ready: true,
                  configured: true,
                  enabled: true,
                  remaining: 5,
                  daily_limit: 5,
                  message: "Ready",
                }
              : {
                  mode: "live",
                  workflow: "planning",
                  answer: "A personalized result",
                  suggestions: {},
                  proposal: null,
                },
          ),
          { headers: { "content-type": "application/json" } },
        ),
    );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
describe("per-request paid-call approval", () => {
  it("changing mode and opening approval do not initiate a model request", async () => {
    const fetch = mockedFetch();
    render(
      <AIProvider>
        <Probe />
      </AIProvider>,
    );
    await waitFor(() =>
      expect(
        (screen.getByRole("option", { name: "Live AI" }) as HTMLOptionElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.change(screen.getByLabelText("AI mode"), {
      target: { value: "live" },
    });
    expect(
      fetch.mock.calls.filter((c) => String(c[0]).includes("/ai/planning")),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Generate test plan" }));
    expect(
      screen
        .getByRole("button", { name: "Approve & request Live AI" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      fetch.mock.calls.filter((c) => String(c[0]).includes("/ai/planning")),
    ).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel without calling AI" }),
    );
    expect(
      fetch.mock.calls.filter((c) => String(c[0]).includes("/ai/planning")),
    ).toHaveLength(0);
  });
  it("only sends approved requests after the checkbox and approval button", async () => {
    const fetch = mockedFetch();
    render(
      <AIProvider>
        <Probe />
      </AIProvider>,
    );
    await waitFor(() =>
      expect(
        (screen.getByRole("option", { name: "Live AI" }) as HTMLOptionElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate test plan" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I explicitly approve/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Approve & request Live AI" }),
    );
    await waitFor(() =>
      expect(
        fetch.mock.calls.filter((c) => String(c[0]).includes("/ai/planning")),
      ).toHaveLength(1),
    );
    const call = fetch.mock.calls.find((c) =>
      String(c[0]).includes("/ai/planning"),
    )!;
    const payload = JSON.parse(call[1].body);
    expect(payload.approved).toBe(true);
    expect(payload.request_id).toBeTruthy();
    expect(payload).not.toHaveProperty("api_key");
  });
});
