// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Landing } from "./Landing";
beforeEach(() => {
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
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("routes every landing CTA to a real workspace, wizard or guided demo action", () => {
  const onCreate = vi.fn(),
    onEnter = vi.fn(),
    onDemo = vi.fn();
  render(<Landing onCreate={onCreate} onEnter={onEnter} onDemo={onDemo} />);
  fireEvent.click(screen.getByRole("button", { name: "Plan with AI" }));
  expect(onCreate).toHaveBeenCalledWith();
  fireEvent.click(screen.getByRole("button", { name: "Open your studio" }));
  expect(onEnter).toHaveBeenCalledOnce();
  fireEvent.click(
    screen.getByRole("button", { name: "Take the 2-minute tour" }),
  );
  expect(onDemo).toHaveBeenCalledOnce();
  for (const [label, kind] of [
    ["Plan a wedding", "Wedding"],
    ["Plan a birthday", "Birthday"],
    ["Plan a community event", "Community event"],
  ]) {
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(onCreate).toHaveBeenLastCalledWith(kind);
  }
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
    "Make moments",
  );
  expect(
    screen
      .getByAltText(
        "A wedding table with white flowers, greenery and glassware",
      )
      .getAttribute("src"),
  ).toBe("/images/wedding.webp");
});
