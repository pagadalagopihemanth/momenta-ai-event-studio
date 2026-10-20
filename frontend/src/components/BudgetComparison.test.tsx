// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BudgetComparison } from "./BudgetComparison";
import type { Plan } from "../types";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows exact proposal differences and unchanged priorities without mutating the plan", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  const before = {
    event: { budget: 90000000, currency: "INR", priorities: ["Catering"] },
    budget: [
      { category: "Catering", allocated: 27000000 },
      { category: "Venue", allocated: 63000000 },
    ],
  } as Plan;
  const after = {
    ...before,
    event: { ...before.event, budget: 70000000 },
    budget: [before.budget[0], { category: "Venue", allocated: 43000000 }],
  } as Plan;
  const snapshot = JSON.stringify(before);
  render(<BudgetComparison before={before} after={after} />);
  expect(screen.getByText("₹2,00,000")).toBeTruthy();
  expect(screen.getByText("-₹2,00,000")).toBeTruthy();
  expect(screen.getByLabelText("Priority unchanged")).toBeTruthy();
  expect(JSON.stringify(before)).toBe(snapshot);
});
it("omits a redundant visualization when allocations and budget do not change", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  const p = {
    event: { budget: 100, currency: "INR" },
    budget: [],
  } as unknown as Plan;
  const { container } = render(<BudgetComparison before={p} after={p} />);
  expect(container.innerHTML).toBe("");
});
