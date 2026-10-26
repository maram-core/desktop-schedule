import React, { useEffect, useRef, useState } from "react";
import "./App.css";

type Task = { id: string; title: string; done: boolean; children: Task[] };
type Slot = {
  id: string;
  time: string;
  end: string;
  title: string;
  category: string;
  done: boolean;
};
type Day = { tasks: Task[]; slots: Slot[]; note: string };
type Store = Record<string, Day>;
const STORAGE = "ethereal-schedule-v1";
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const emptyDay = (): Day => ({ tasks: [], slots: [], note: "" });
const today = () => key(new Date());
function initial(): Store {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every(
        (d: any) =>
          d &&
          typeof d.note === "string" &&
          Array.isArray(d.tasks) &&
          Array.isArray(d.slots) &&
          d.tasks.every(validTask) &&
          d.slots.every(
            (s: any) =>
              s &&
              typeof s.id === "string" &&
              typeof s.title === "string" &&
              typeof s.time === "string" &&
              typeof s.end === "string" &&
              typeof s.category === "string" &&
              typeof s.done === "boolean",
          ),
      )
    )
      return value;
  } catch {
    /* A fresh workspace is safe when storage is unavailable or invalid. */
  }
  return {};
}
function validTask(t: any): boolean {
  return (
    t &&
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.done === "boolean" &&
    Array.isArray(t.children) &&
    t.children.every(validTask)
  );
}
function flatten(tasks: Task[]): Task[] {
  return tasks.reduce<Task[]>(
    (all, t) => [...all, t, ...flatten(t.children)],
    [],
  );
}
function changeTask(
  tasks: Task[],
  id: string,
  update: (t: Task) => Task,
): Task[] {
  return tasks.map((t) =>
    t.id === id
      ? update(t)
      : reconcile({ ...t, children: changeTask(t.children, id, update) }),
  );
}
function reconcile(t: Task): Task {
  return t.children.length
    ? { ...t, done: t.children.every((c) => c.done) }
    : t;
}
function removeTask(tasks: Task[], id: string): Task[] {
  return tasks
    .filter((t) => t.id !== id)
    .map((t) => reconcile({ ...t, children: removeTask(t.children, id) }));
}
function setDone(t: Task, done: boolean): Task {
  return { ...t, done, children: t.children.map((c) => setDone(c, done)) };
}
function TaskItem({
  task,
  update,
  remove,
  add,
  depth = 0,
}: {
  task: Task;
  update: (id: string, done: boolean) => void;
  remove: (id: string) => void;
  add: (id: string, title: string) => void;
  depth?: number;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  return (
    <li className="task-branch">
      <div className={`task-line ${task.done ? "is-done" : ""}`}>
        <input
          type="checkbox"
          aria-label={`Complete ${task.title}`}
          checked={task.done}
          onChange={(e) => update(task.id, e.target.checked)}
        />
        <span>{task.title}</span>
        <div className="task-actions">
          {depth < 4 && (
            <button
              className="icon-button"
              aria-label={`Add subtask to ${task.title}`}
              onClick={() => setAdding(!adding)}
            >
              ＋
            </button>
          )}
          <button
            className="icon-button delete"
            aria-label={`Delete ${task.title}`}
            onClick={() => remove(task.id)}
          >
            ×
          </button>
        </div>
      </div>
      {adding && (
        <form
          className="inline-form subtask-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) {
              add(task.id, title.trim());
              setTitle("");
              setAdding(false);
            }
          }}
        >
          <input
            autoFocus
            aria-label="Subtask title"
            value={title}
            maxLength={180}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A smaller step…"
            required
          />
          <button type="submit">Add</button>
        </form>
      )}
      {task.children.length > 0 && (
        <ul className="subtasks">
          {task.children.map((c) => (
            <TaskItem
              key={c.id}
              task={c}
              update={update}
              remove={remove}
              add={add}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
function Calendar({
  selected,
  select,
  close,
  store,
}: {
  selected: string;
  select: (d: string) => void;
  close: () => void;
  store: Store;
}) {
  const [month, setMonth] = useState(new Date(`${selected}T12:00:00`));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const buttons =
          ref.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        if (e.shiftKey && document.activeElement === buttons[0]) {
          e.preventDefault();
          buttons[buttons.length - 1].focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === buttons[buttons.length - 1]
        ) {
          e.preventDefault();
          buttons[0].focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [close]);
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const offset =
    (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="calendar glass"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-title"
      >
        <div className="section-heading">
          <h2 id="calendar-title">Find your day</h2>
          <button
            className="icon-button"
            aria-label="Close calendar"
            onClick={close}
          >
            ×
          </button>
        </div>
        <div className="month-nav">
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <strong>
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </div>
        <div className="calendar-grid">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span className="weekday" key={i}>
              {d}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const d = key(
              new Date(month.getFullYear(), month.getMonth(), i + 1),
            );
            return (
              <button
                key={d}
                className={`${d === selected ? "selected" : ""} ${d === today() ? "today" : ""}`}
                aria-label={d}
                aria-pressed={d === selected}
                onClick={() => {
                  select(d);
                  close();
                }}
              >
                {i + 1}
                {(store[d]?.tasks.length || store[d]?.slots.length) > 0 && (
                  <i />
                )}
              </button>
            );
          })}
        </div>
        <button
          className="soft-button full"
          onClick={() => {
            select(today());
            close();
          }}
        >
          Back to today
        </button>
      </div>
    </div>
  );
}
function App() {
  const [store, setStore] = useState<Store>(initial);
  const [date, setDate] = useState(today);
  const [calendar, setCalendar] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [slotOpen, setSlotOpen] = useState(false);
  const [slotTitle, setSlotTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [category, setCategory] = useState("Focus");
  const [saveError, setSaveError] = useState(false);
  const day = store[date] || emptyDay();
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(store));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [store]);
  const updateDay = (change: (d: Day) => Day) =>
    setStore((old) => ({ ...old, [date]: change(old[date] || emptyDay()) }));
  const tasks = flatten(day.tasks);
  const total = tasks.length + day.slots.length;
  const completed =
    tasks.filter((t) => t.done).length + day.slots.filter((s) => s.done).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const selectedDate = new Date(`${date}T12:00:00`);
  const move = (n: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + n);
    setDate(key(d));
    setSlotOpen(false);
  };
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <header className="topbar">
        <a className="brand" href="/">
          <img
            className="brand-icon"
            src={`${process.env.PUBLIC_URL}/ethereal.svg`}
            alt=""
          />
          <span>
            ethereal<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="topbar-caption">A little clarity. A little calm.</span>
        <div className="local-badge">
          <span /> Your personal space
        </div>
      </header>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">MAKE ROOM FOR WHAT MATTERS</div>
            <h1>
              A softer way to
              <br />
              <em>shape your day.</em>
            </h1>
            <p>Your plans, your pace. Take it one small step at a time.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orb orb-back" />
            <div className="orb orb-front" />
            <span className="sparkle sparkle-one">✧</span>
            <span className="sparkle sparkle-two">✦</span>
            <span className="art-caption">find your flow</span>
          </div>
        </section>
        <section className="date-panel glass" aria-label="Choose a day">
          <div className="date-heading">
            <div>
              <span className="eyebrow">
                {date === today()
                  ? "A FRESH LITTLE TODAY"
                  : "SPACE FOR YOUR PLANS"}
              </span>
              <h2>
                {selectedDate.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>
            <div className="date-controls">
              <button className="soft-button" onClick={() => setDate(today())}>
                Today
              </button>
              <button className="soft-button" onClick={() => setCalendar(true)}>
                <span aria-hidden="true">▦</span> Calendar
              </button>
              <button
                className="icon-button"
                aria-label="Previous day"
                onClick={() => move(-1)}
              >
                ‹
              </button>
              <button
                className="icon-button"
                aria-label="Next day"
                onClick={() => move(1)}
              >
                ›
              </button>
            </div>
          </div>
          <div className="week-strip">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + i);
              const k = key(d);
              return (
                <button
                  key={k}
                  className={`day-button ${k === date ? "active" : ""}`}
                  aria-pressed={k === date}
                  onClick={() => {
                    setDate(k);
                    setSlotOpen(false);
                  }}
                >
                  <span>
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <strong>{d.getDate()}</strong>
                  <i className={k === today() ? "today-dot" : ""} />
                </button>
              );
            })}
          </div>
        </section>
        <div className="workspace">
          <div className="main-column">
            <section className="glass schedule-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ONE MOMENT AT A TIME</span>
                  <h2>
                    <span className="section-icon peach">◷</span> Daily schedule
                  </h2>
                </div>
                <button
                  className="soft-button"
                  onClick={() => setSlotOpen(!slotOpen)}
                >
                  ＋ Add time slot
                </button>
              </div>
              <div className="section-subtitle">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              {slotOpen && (
                <form
                  className="slot-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!slotTitle.trim() || end <= time) return;
                    updateDay((d) => ({
                      ...d,
                      slots: [
                        ...d.slots,
                        {
                          id: uid(),
                          title: slotTitle.trim(),
                          time,
                          end,
                          category,
                          done: false,
                        },
                      ],
                    }));
                    setSlotTitle("");
                    setSlotOpen(false);
                  }}
                >
                  <label className="wide">
                    What are you making time for?
                    <input
                      autoFocus
                      required
                      maxLength={180}
                      value={slotTitle}
                      onChange={(e) => setSlotTitle(e.target.value)}
                      placeholder="A little focused work…"
                    />
                  </label>
                  <label>
                    From
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </label>
                  <label>
                    Until
                    <input
                      type="time"
                      required
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                  <label>
                    Kind
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {["Focus", "Personal", "Wellbeing", "Meeting"].map(
                        (c) => (
                          <option key={c}>{c}</option>
                        ),
                      )}
                    </select>
                  </label>
                  {end <= time && (
                    <p role="alert" className="wide error">
                      Choose an end time after the start time.
                    </p>
                  )}
                  <div className="form-actions wide">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setSlotOpen(false)}
                    >
                      Cancel
                    </button>
                    <button className="primary-button" type="submit">
                      Create time slot
                    </button>
                  </div>
                </form>
              )}
              <div className="timeline">
                {day.slots.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-symbol">☁</span>
                    <h3>A little breathing room</h3>
                    <p>
                      Your day is a blank canvas.
                      <br />
                      Make space for something that matters.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setSlotOpen(true)}
                    >
                      ＋ Plan your first moment
                    </button>
                  </div>
                ) : (
                  [...day.slots]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((slot) => (
                      <div className="timeline-row" key={slot.id}>
                        <div className="time-label">
                          {slot.time}
                          <span>{slot.end}</span>
                        </div>
                        <div
                          className={`slot-card ${slot.category.toLowerCase()} ${slot.done ? "is-done" : ""}`}
                        >
                          <div className="slot-content">
                            <span className="category-label">
                              {slot.category}
                            </span>
                            <h3>{slot.title}</h3>
                            <span className="slot-duration">
                              {slot.time} — {slot.end}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            aria-label={`Complete ${slot.title}`}
                            checked={slot.done}
                            onChange={(e) =>
                              updateDay((d) => ({
                                ...d,
                                slots: d.slots.map((s) =>
                                  s.id === slot.id
                                    ? { ...s, done: e.target.checked }
                                    : s,
                                ),
                              }))
                            }
                          />
                          <button
                            className="icon-button delete"
                            aria-label={`Delete ${slot.title}`}
                            onClick={() =>
                              updateDay((d) => ({
                                ...d,
                                slots: d.slots.filter((s) => s.id !== slot.id),
                              }))
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
              <div className="panel-footnote">
                ✧ Leave a little space for the unexpected.
              </div>
            </section>
            <section className="glass notes-panel">
              <div className="section-heading">
                <h2>
                  <span className="section-icon yellow">☼</span> A thought to
                  keep
                </h2>
                <span className="small-label">JUST FOR YOU</span>
              </div>
              <textarea
                aria-label="Daily reflection"
                placeholder="A small intention, a grateful thought, or something to remember…"
                maxLength={5000}
                value={day.note}
                onChange={(e) =>
                  updateDay((d) => ({ ...d, note: e.target.value }))
                }
              />
            </section>
          </div>
          <aside>
            <section className="glass progress-panel">
              <span className="eyebrow">EVERY LITTLE STEP COUNTS</span>
              <h2>Your daily bloom</h2>
              <div
                className="progress-ring"
                role="progressbar"
                aria-label="Daily completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                style={{
                  background: `conic-gradient(#9f92cf ${progress}%, rgba(171,158,202,.13) 0)`,
                }}
              >
                <div>
                  <strong>
                    {progress}
                    <span>%</span>
                  </strong>
                  <span>complete</span>
                </div>
              </div>
              <p>
                {completed === total && total > 0
                  ? "You made room. You made it happen."
                  : "Small steps. Beautiful progress."}
              </p>
              <span className="progress-count">
                {completed} of {total} items completed
              </span>
            </section>
            <section className="glass checklist-panel">
              <div className="section-heading">
                <h2>
                  <span className="section-icon lavender">✓</span> Little to-dos
                </h2>
                <span className="count-pill">
                  {tasks.filter((t) => !t.done).length}
                </span>
              </div>
              <p className="section-subtitle">
                Clear your mind, one check at a time.
              </p>
              <form
                className="inline-form task-entry"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!taskTitle.trim()) return;
                  updateDay((d) => ({
                    ...d,
                    tasks: [
                      ...d.tasks,
                      {
                        id: uid(),
                        title: taskTitle.trim(),
                        done: false,
                        children: [],
                      },
                    ],
                  }));
                  setTaskTitle("");
                }}
              >
                <input
                  aria-label="New task"
                  placeholder="Add a little to-do…"
                  value={taskTitle}
                  maxLength={180}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
                <button type="submit" aria-label="Add task">
                  ＋
                </button>
              </form>
              {day.tasks.length === 0 ? (
                <p className="task-empty">
                  Nothing on your mind?
                  <br />
                  Enjoy this quiet little moment.
                </p>
              ) : (
                <ul className="task-list">
                  {day.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      update={(id, done) =>
                        updateDay((d) => ({
                          ...d,
                          tasks: changeTask(d.tasks, id, (t) =>
                            setDone(t, done),
                          ),
                        }))
                      }
                      remove={(id) =>
                        updateDay((d) => ({
                          ...d,
                          tasks: removeTask(d.tasks, id),
                        }))
                      }
                      add={(id, title) =>
                        updateDay((d) => ({
                          ...d,
                          tasks: changeTask(d.tasks, id, (t) => ({
                            ...t,
                            done: false,
                            children: [
                              ...t.children,
                              { id: uid(), title, done: false, children: [] },
                            ],
                          })),
                        }))
                      }
                    />
                  ))}
                </ul>
              )}
              <div className="checklist-tip">
                Use ＋ beside a task to break it into smaller steps.
              </div>
            </section>
            <div className="quote">
              <span>“</span>You don't have to do it all.
              <br />
              Just the next little thing.<i>ONE DAY AT A TIME</i>
            </div>
          </aside>
        </div>
        <footer>
          <span>✳ ethereal · made for a more mindful day</span>
          <span role="status">
            {saveError
              ? "Unable to save locally. Keep this tab open to retain changes."
              : "✓ Saved on this device"}
          </span>
        </footer>
      </main>
      {calendar && (
        <Calendar
          selected={date}
          select={setDate}
          close={() => setCalendar(false)}
          store={store}
        />
      )}
    </div>
  );
}
export default App;
