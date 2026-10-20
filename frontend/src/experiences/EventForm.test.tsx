// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { EventForm } from "./EventForm";
afterEach(cleanup);
it("carries an occasion selected on the landing page through the existing event wizard", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(
    <EventForm
      initialKind="Birthday"
      busy={false}
      onCancel={() => {}}
      onSave={save}
    />,
  );
  expect(
    (screen.getByRole("combobox", { name: "Event type" }) as HTMLSelectElement)
      .value,
  ).toBe("Birthday");
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Expected guests",
      }) as HTMLInputElement
    ).value,
  ).toBe("40");
  expect(
    (screen.getByRole("spinbutton", { name: /^Budget$/ }) as HTMLInputElement)
      .value,
  ).toBe("50000");
  fireEvent.change(
    screen.getByRole("textbox", { name: "What are we celebrating?" }),
    { target: { value: "Momenta birthday" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Make it personal" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Create my celebration" }),
  );
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toMatchObject({
    kind: "Birthday",
    name: "Momenta birthday",
    guests: 40,
    budget: 5000000,
    theme: "Modern themed party",
  });
});
