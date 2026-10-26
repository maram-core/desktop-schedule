import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";

beforeEach(() => localStorage.clear());
function addTask(title: string) {
  fireEvent.change(screen.getByLabelText("New task"), {
    target: { value: title },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add task" }));
}

test("creates nested tasks, tracks progress, and persists them across reloads", () => {
  const view = render(<App />);
  addTask("Write a chapter");
  fireEvent.click(screen.getByLabelText("Add subtask to Write a chapter"));
  fireEvent.change(screen.getByLabelText("Subtask title"), {
    target: { value: "Outline ideas" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  expect(screen.getByLabelText("Daily completion")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  fireEvent.click(screen.getByLabelText("Complete Write a chapter"));
  expect(screen.getByLabelText("Complete Outline ideas")).toBeChecked();
  expect(screen.getByLabelText("Daily completion")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  fireEvent.click(screen.getByLabelText("Complete Outline ideas"));
  expect(screen.getByLabelText("Complete Write a chapter")).not.toBeChecked();
  fireEvent.click(screen.getByLabelText("Complete Outline ideas"));
  expect(screen.getByLabelText("Complete Write a chapter")).toBeChecked();
  view.unmount();
  render(<App />);
  expect(screen.getByLabelText("Complete Write a chapter")).toBeChecked();
  expect(screen.getByLabelText("Complete Outline ideas")).toBeChecked();
  fireEvent.click(screen.getByLabelText("Delete Write a chapter"));
  expect(screen.queryByText("Outline ideas")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Daily completion")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
});

test("keeps tasks and reflections isolated by day and navigates the calendar", () => {
  render(<App />);
  addTask("Today only");
  fireEvent.change(screen.getByLabelText("Daily reflection"), {
    target: { value: "Make space for rest" },
  });
  fireEvent.click(screen.getByLabelText("Next day"));
  expect(screen.queryByText("Today only")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Daily reflection")).toHaveValue("");
  fireEvent.click(screen.getByLabelText("Previous day"));
  expect(screen.getByText("Today only")).toBeInTheDocument();
  expect(screen.getByLabelText("Daily reflection")).toHaveValue(
    "Make space for rest",
  );
  fireEvent.click(screen.getByRole("button", { name: /Calendar/ }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByLabelText("Next month"));
  const days = within(dialog)
    .getAllByRole("button")
    .filter((b) =>
      /^\d{4}-\d{2}-\d{2}$/.test(b.getAttribute("aria-label") || ""),
    );
  fireEvent.click(days[0]);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByText("Today only")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Today" }));
  expect(screen.getByText("Today only")).toBeInTheDocument();
});

test("creates and completes schedule slots, rejects reversed times, and deletes slots", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Add time slot/ }));
  fireEvent.change(screen.getByLabelText("What are you making time for?"), {
    target: { value: "Design session" },
  });
  fireEvent.change(screen.getByLabelText("Until"), {
    target: { value: "08:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create time slot" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Choose an end time after the start time.",
  );
  expect(
    screen.queryByLabelText("Complete Design session"),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Until"), {
    target: { value: "11:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create time slot" }));
  expect(screen.getByText("Design session")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Complete Design session"));
  expect(screen.getByLabelText("Daily completion")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  fireEvent.click(screen.getByLabelText("Delete Design session"));
  expect(screen.queryByText("Design session")).not.toBeInTheDocument();
});

test("recovers from invalid local data and closes the calendar with Escape", () => {
  localStorage.setItem("ethereal-schedule-v1", "{broken");
  render(<App />);
  expect(
    screen.getByRole("heading", { name: /shape your day/ }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Calendar/ }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
