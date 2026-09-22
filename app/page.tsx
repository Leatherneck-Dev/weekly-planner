"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, ScheduleEvent, Todo, Week } from "@/lib/db";
import {
  CONDITION_LEVELS,
  DAY_LABELS,
  HALF_HOUR_TIMES,
  SCHEDULE_GROUP_STARTS,
  SCHEDULE_SLOTS,
  TODO_STATUS_OPTIONS,
  currentWeekStart,
  diffInDays,
  formatDate,
  formatMonthLabel,
  formatWeekRangeCompact,
  getDominantYearMonth,
  getWeekDates,
  shiftWeek,
  weekOfMonth,
  weeksInMonth,
} from "@/lib/week";

const CATEGORY_TEXT_COLORS = [
  "text-blue-700 dark:text-blue-300",
  "text-emerald-700 dark:text-emerald-300",
  "text-amber-700 dark:text-amber-300",
  "text-purple-700 dark:text-purple-300",
  "text-rose-700 dark:text-rose-300",
  "text-cyan-700 dark:text-cyan-300",
];

const CATEGORY_DOT_COLORS = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-purple-400",
  "bg-rose-400",
  "bg-cyan-400",
];

const EVENT_COLORS = [
  "bg-orange-500 dark:bg-orange-600",
  "bg-teal-500 dark:bg-teal-600",
  "bg-indigo-500 dark:bg-indigo-600",
  "bg-pink-500 dark:bg-pink-600",
];

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });
}

export default function Home() {
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const [week, setWeek] = useState<Week | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTodoText, setNewTodoText] = useState<Record<string, string>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState("");
  const [newEventLabel, setNewEventLabel] = useState("");
  const [newEventStart, setNewEventStart] = useState(formatDate(new Date()));
  const [newEventEnd, setNewEventEnd] = useState(formatDate(new Date()));
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [dragOverPool, setDragOverPool] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<{ day: number; slot: number } | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoriesSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weeks/${weekStart}`)
      .then((res) => res.json())
      .then((data: Week) => {
        if (!cancelled) setWeek(data);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events`)
      .then((res) => res.json())
      .then((data: ScheduleEvent[]) => {
        if (!cancelled) setEvents(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/categories`)
      .then((res) => res.json())
      .then((data: Category[]) => {
        if (!cancelled) setCategories(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (eventsSaveTimeout.current) clearTimeout(eventsSaveTimeout.current);
      if (categoriesSaveTimeout.current) clearTimeout(categoriesSaveTimeout.current);
    };
  }, []);

  const loading = !week || week.weekStart !== weekStart || !categories;
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const todayStr = formatDate(new Date());

  const { year: activeYear, month: activeMonth } = useMemo(
    () => getDominantYearMonth(weekStart),
    [weekStart]
  );
  const monthWeeks = useMemo(() => weeksInMonth(activeYear, activeMonth), [activeYear, activeMonth]);
  const activeWeekOfMonth = useMemo(() => weekOfMonth(weekStart), [weekStart]);

  function jumpToMonth(month: number) {
    const weeks = weeksInMonth(activeYear, month);
    if (weeks.length > 0) setWeekStart(weeks[Math.min(activeWeekOfMonth - 1, weeks.length - 1)]);
  }

  function jumpToYear(year: number) {
    const weeks = weeksInMonth(year, activeMonth);
    if (weeks.length > 0) setWeekStart(weeks[Math.min(activeWeekOfMonth - 1, weeks.length - 1)]);
  }

  // Clip each event to the days it overlaps in the visible week, since an
  // event's date range may extend into other weeks.
  const eventsThisWeek = useMemo(() => {
    if (!events) return [];
    const weekEndOffset = 6;
    return events
      .map((ev) => {
        const startOffset = diffInDays(weekStart, ev.startDate);
        const endOffset = diffInDays(weekStart, ev.endDate);
        if (endOffset < 0 || startOffset > weekEndOffset) return null;
        return {
          ...ev,
          startDay: Math.max(0, startOffset),
          endDay: Math.min(weekEndOffset, endOffset),
          continuesBefore: startOffset < 0,
          continuesAfter: endOffset > weekEndOffset,
        };
      })
      .filter((ev): ev is NonNullable<typeof ev> => ev !== null);
  }, [events, weekStart]);

  function persist(next: Week) {
    setWeek(next);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch(`/api/weeks/${next.weekStart}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todos: next.todos,
          days: next.days,
        }),
      });
    }, 400);
  }

  function persistEvents(next: ScheduleEvent[]) {
    setEvents(next);
    if (eventsSaveTimeout.current) clearTimeout(eventsSaveTimeout.current);
    eventsSaveTimeout.current = setTimeout(() => {
      fetch(`/api/events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: next }),
      });
    }, 400);
  }

  // Categories are shared across every week, so a new one keeps showing up going forward.
  function persistCategories(next: Category[]) {
    setCategories(next);
    if (categoriesSaveTimeout.current) clearTimeout(categoriesSaveTimeout.current);
    categoriesSaveTimeout.current = setTimeout(() => {
      fetch(`/api/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: next }),
      });
    }, 400);
  }

  function categoryIndex(categoryId: string): number {
    if (!categories) return 0;
    return Math.max(categories.findIndex((c) => c.id === categoryId), 0);
  }

  function categoryTextColor(categoryId: string): string {
    return CATEGORY_TEXT_COLORS[categoryIndex(categoryId) % CATEGORY_TEXT_COLORS.length];
  }

  function categoryDotColor(categoryId: string): string {
    return CATEGORY_DOT_COLORS[categoryIndex(categoryId) % CATEGORY_DOT_COLORS.length];
  }

  function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categories) return;
    const name = newCategoryName.trim();
    if (!name) return;
    const category: Category = {
      id: crypto.randomUUID(),
      name,
      order: categories.length,
    };
    setNewCategoryName("");
    persistCategories([...categories, category]);
  }

  function renameCategory(id: string) {
    if (!categories) return;
    const name = editingCategoryName.trim();
    setEditingCategoryId(null);
    if (!name) return;
    persistCategories(categories.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  function deleteCategory(id: string) {
    if (!categories || !week) return;
    if (!confirm("이 카테고리와 소속된 할 일을 모두 삭제할까요?")) return;
    persistCategories(categories.filter((c) => c.id !== id));
    persist({ ...week, todos: week.todos.filter((t) => t.categoryId !== id) });
  }

  function addTodo(categoryId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!week) return;
    const text = (newTodoText[categoryId] ?? "").trim();
    if (!text) return;
    const todo: Todo = {
      id: crypto.randomUUID(),
      categoryId,
      text,
      day: null,
      time: null,
      status: null,
    };
    setNewTodoText((prev) => ({ ...prev, [categoryId]: "" }));
    persist({ ...week, todos: [...week.todos, todo] });
  }

  function updateTodo(id: string, updates: Partial<Todo>) {
    if (!week) return;
    persist({
      ...week,
      todos: week.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    });
  }

  function deleteTodo(id: string) {
    if (!week) return;
    persist({ ...week, todos: week.todos.filter((t) => t.id !== id) });
  }

  function saveTodoText(id: string) {
    const text = editingTodoText.trim();
    setEditingTodoId(null);
    if (!text) return;
    updateTodo(id, { text });
  }

  function startEditingTodo(todo: Todo) {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
  }

  function updateDaySlot(dayIndex: number, slotIndex: number, text: string) {
    if (!week) return;
    const days = week.days.map((d, i) =>
      i === dayIndex ? { ...d, slots: d.slots.map((s, j) => (j === slotIndex ? text : s)) } : d
    );
    persist({ ...week, days });
  }

  function updateDayCondition(dayIndex: number, condition: number | null) {
    if (!week) return;
    const days = week.days.map((d, i) => (i === dayIndex ? { ...d, condition } : d));
    persist({ ...week, days });
  }

  function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!events) return;
    const label = newEventLabel.trim();
    if (!label) return;
    const startDate = newEventStart <= newEventEnd ? newEventStart : newEventEnd;
    const endDate = newEventStart <= newEventEnd ? newEventEnd : newEventStart;
    const event: ScheduleEvent = { id: crypto.randomUUID(), label, startDate, endDate };
    setNewEventLabel("");
    persistEvents([...events, event]);
  }

  function deleteEvent(id: string) {
    if (!events) return;
    persistEvents(events.filter((ev) => ev.id !== id));
  }

  // "pool" = dragged from a category's unassigned list (must stay there when dropped).
  // "day" = dragged from a day's own "오늘 할 일" checklist (free to move/return).
  function handleTodoDragStart(e: React.DragEvent, todoId: string, origin: "pool" | "day") {
    e.dataTransfer.setData("text/plain", JSON.stringify({ todoId, origin }));
    e.dataTransfer.effectAllowed = "copyMove";
  }

  function readDragPayload(e: React.DragEvent): { todoId: string; origin: "pool" | "day" } | null {
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw);
      if (typeof payload?.todoId === "string" && (payload.origin === "pool" || payload.origin === "day")) {
        return payload;
      }
    } catch {
      // ignore malformed payloads
    }
    return null;
  }

  // Only checklist items (origin "day") get reassigned to a different day this way;
  // pool items are placed via dropOnSlot instead, so they never leave the category.
  function dropTodoOnDay(e: React.DragEvent, dayIndex: number) {
    e.preventDefault();
    setDragOverDay(null);
    const payload = readDragPayload(e);
    if (!payload || payload.origin !== "day") return;
    updateTodo(payload.todoId, { day: dayIndex });
  }

  function dropTodoOnPool(e: React.DragEvent) {
    e.preventDefault();
    setDragOverPool(false);
    const payload = readDragPayload(e);
    if (!payload || payload.origin !== "day") return;
    updateTodo(payload.todoId, { day: null, time: null });
  }

  // Dropping a category item onto a specific time slot copies its text into that
  // slot, leaving the original item in the category list untouched.
  function dropTodoOnSlot(e: React.DragEvent, dayIndex: number, slotIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDay(null);
    setDragOverSlot(null);
    if (!week) return;
    const payload = readDragPayload(e);
    if (!payload || payload.origin !== "pool") return;
    const todo = week.todos.find((t) => t.id === payload.todoId);
    if (!todo) return;
    const existing = week.days[dayIndex].slots[slotIndex];
    updateDaySlot(dayIndex, slotIndex, existing ? `${existing} ${todo.text}` : todo.text);
  }

  const isCurrentWeek = weekStart === currentWeekStart();

  return (
    <div className="min-h-screen bg-neutral-50 font-sans dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-[1700px] px-6 py-6">
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 pb-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <header className="flex flex-col items-center gap-2 pt-5 pb-5">
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <select
                value={activeYear}
                onChange={(e) => jumpToYear(Number(e.target.value))}
                aria-label="연도 선택"
                className="rounded border border-neutral-200 bg-transparent px-1.5 py-0.5 outline-none dark:border-neutral-700"
              >
                {Array.from({ length: 11 }, (_, i) => activeYear - 5 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              <select
                value={activeMonth}
                onChange={(e) => jumpToMonth(Number(e.target.value))}
                aria-label="월 선택"
                className="rounded border border-neutral-200 bg-transparent px-1.5 py-0.5 outline-none dark:border-neutral-700"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
              <select
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                aria-label="주차 선택"
                className="rounded border border-neutral-200 bg-transparent px-1.5 py-0.5 outline-none dark:border-neutral-700"
              >
                {monthWeeks.map((ws, i) => (
                  <option key={ws} value={ws}>
                    {i + 1}주차
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
                aria-label="이전 주"
                className="text-xl text-neutral-300 transition-colors hover:text-neutral-700 dark:text-neutral-600 dark:hover:text-neutral-200"
              >
                ‹
              </button>
              <div className="text-center">
                <h1 className="text-xl font-medium tracking-wide text-neutral-900 dark:text-neutral-50">
                  {formatMonthLabel(weekStart)}
                </h1>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {formatWeekRangeCompact(weekStart)}
                  {!isCurrentWeek && (
                    <button
                      onClick={() => setWeekStart(currentWeekStart())}
                      className="ml-2 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      오늘로
                    </button>
                  )}
                </p>
              </div>
              <button
                onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
                aria-label="다음 주"
                className="text-xl text-neutral-300 transition-colors hover:text-neutral-700 dark:text-neutral-600 dark:hover:text-neutral-200"
              >
                ›
              </button>
            </div>
          </header>

          {loading || !week || !categories ? (
            <p className="text-center text-sm text-neutral-400">불러오는 중...</p>
          ) : (
            <>
              <section className="mb-6 flex flex-wrap items-start gap-x-8 gap-y-4 border-b border-neutral-100 pb-5 dark:border-neutral-800">
                {categories.map((category) => {
                  const poolTodos = week.todos.filter(
                    (t) => t.categoryId === category.id && t.day === null
                  );
                  return (
                    <div key={category.id} className="w-52 shrink-0">
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-neutral-200 pb-1.5 dark:border-neutral-800">
                        {editingCategoryId === category.id ? (
                          <input
                            autoFocus
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onBlur={() => renameCategory(category.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameCategory(category.id);
                              if (e.key === "Escape") setEditingCategoryId(null);
                            }}
                            className="flex-1 border-b border-neutral-300 bg-transparent text-xs font-medium text-neutral-900 outline-none dark:border-neutral-600 dark:text-neutral-50"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => {
                              setEditingCategoryId(category.id);
                              setEditingCategoryName(category.name);
                            }}
                            className={`text-xs font-semibold tracking-wide ${categoryTextColor(category.id)}`}
                          >
                            {category.name}
                          </span>
                        )}
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="text-[10px] text-neutral-300 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={(e) => addTodo(category.id, e)} className="mb-1.5 flex gap-1.5">
                        <input
                          type="text"
                          value={newTodoText[category.id] ?? ""}
                          onChange={(e) =>
                            setNewTodoText((prev) => ({ ...prev, [category.id]: e.target.value }))
                          }
                          placeholder="할 일 추가"
                          className="flex-1 border-b border-neutral-200 bg-transparent py-0.5 text-[11px] text-neutral-800 outline-none placeholder:text-neutral-300 focus:border-neutral-400 dark:border-neutral-800 dark:text-neutral-100"
                        />
                        <button
                          type="submit"
                          className="text-xs text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100"
                        >
                          +
                        </button>
                      </form>

                      <ul
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverPool(true);
                        }}
                        onDragLeave={() => setDragOverPool(false)}
                        onDrop={dropTodoOnPool}
                        className={`flex min-h-6 flex-col rounded ${
                          dragOverPool ? "bg-neutral-100 dark:bg-neutral-800" : ""
                        }`}
                      >
                        {poolTodos.map((todo) => (
                          <li
                            key={todo.id}
                            draggable
                            onDragStart={(e) => handleTodoDragStart(e, todo.id, "pool")}
                            className="flex cursor-grab items-center gap-1.5 py-1 active:cursor-grabbing"
                          >
                            {editingTodoId === todo.id ? (
                              <input
                                autoFocus
                                value={editingTodoText}
                                onChange={(e) => setEditingTodoText(e.target.value)}
                                onBlur={() => saveTodoText(todo.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveTodoText(todo.id);
                                  if (e.key === "Escape") setEditingTodoId(null);
                                }}
                                className="flex-1 border-b border-neutral-300 bg-transparent text-[11px] text-neutral-900 outline-none dark:border-neutral-600 dark:text-neutral-50"
                              />
                            ) : (
                              <span
                                onDoubleClick={() => startEditingTodo(todo)}
                                className="flex-1 truncate text-[11px] text-neutral-700 dark:text-neutral-300"
                              >
                                {todo.text}
                              </span>
                            )}
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value !== "") updateTodo(todo.id, { day: Number(e.target.value) });
                              }}
                              title="요일에 배치"
                              className="shrink-0 rounded border-none bg-transparent text-[10px] text-neutral-400 outline-none"
                            >
                              <option value="" disabled>
                                배치
                              </option>
                              {DAY_LABELS.map((label, i) => (
                                <option key={label} value={i}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => deleteTodo(todo.id)}
                              className="shrink-0 text-[10px] text-neutral-300 hover:text-red-500"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}

                <form onSubmit={addCategory} className="flex w-40 shrink-0 items-center gap-1.5 self-end pb-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="+ 카테고리"
                    className="flex-1 border-b border-dashed border-neutral-300 bg-transparent py-0.5 text-[11px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-700 dark:text-neutral-100"
                  />
                </form>
              </section>

              <section className="overflow-x-auto">
                <div className="grid min-w-[980px] grid-cols-7 divide-x divide-neutral-100 dark:divide-neutral-800">
                  {weekDates.map((date, dayIndex) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === todayStr;
                    const dayTodos = sortTodos(week.todos.filter((t) => t.day === dayIndex));
                    const day = week.days[dayIndex];
                    return (
                      <div
                        key={dayIndex}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverDay(dayIndex);
                        }}
                        onDragLeave={() => setDragOverDay((d) => (d === dayIndex ? null : d))}
                        onDrop={(e) => dropTodoOnDay(e, dayIndex)}
                        className={`flex flex-col px-3 pt-3 ${
                          dragOverDay === dayIndex
                            ? "bg-neutral-100 dark:bg-neutral-800/60"
                            : isToday
                              ? "bg-neutral-50 dark:bg-neutral-800/30"
                              : ""
                        }`}
                      >
                        <div className="mb-3 text-center">
                          <p
                            className={`text-sm font-semibold ${
                              isToday
                                ? "text-neutral-900 dark:text-white"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {DAY_LABELS[dayIndex]}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {date.getMonth() + 1}/{date.getDate()}
                          </p>
                        </div>

                        <ul className="mb-3 flex flex-col rounded-md bg-neutral-100 px-1.5 py-1 dark:bg-neutral-800/60">
                          {SCHEDULE_SLOTS.map((label, slotIndex) => {
                            const isTimeSlot = slotIndex === 0 || slotIndex === SCHEDULE_SLOTS.length - 1;
                            const isDragOver =
                              dragOverSlot?.day === dayIndex && dragOverSlot?.slot === slotIndex;
                            return (
                              <li
                                key={label}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDragOverSlot({ day: dayIndex, slot: slotIndex });
                                }}
                                onDragLeave={() =>
                                  setDragOverSlot((cur) =>
                                    cur?.day === dayIndex && cur?.slot === slotIndex ? null : cur
                                  )
                                }
                                onDrop={(e) => dropTodoOnSlot(e, dayIndex, slotIndex)}
                                className={`flex items-center gap-1.5 py-0.5 ${
                                  SCHEDULE_GROUP_STARTS.has(slotIndex)
                                    ? "mt-1.5 border-t-2 border-white pt-1.5 dark:border-white"
                                    : ""
                                } ${isDragOver ? "bg-neutral-200 dark:bg-neutral-700" : ""}`}
                              >
                                <span className="w-9 shrink-0 text-[9px] text-neutral-400">{label}</span>
                                {isTimeSlot ? (
                                  <select
                                    value={day.slots[slotIndex]}
                                    onChange={(e) => updateDaySlot(dayIndex, slotIndex, e.target.value)}
                                    className="flex-1 bg-transparent text-[10px] text-neutral-800 outline-none dark:text-neutral-100"
                                  >
                                    <option value=""></option>
                                    {HALF_HOUR_TIMES.map((time) => (
                                      <option key={time} value={time}>
                                        {time}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={day.slots[slotIndex]}
                                    onChange={(e) => updateDaySlot(dayIndex, slotIndex, e.target.value)}
                                    className="flex-1 bg-transparent text-[10px] text-neutral-800 outline-none dark:text-neutral-100"
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {dayTodos.length > 0 && (
                          <div className="mb-3 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                            <p className="mb-1 text-[9px] font-medium text-neutral-400">오늘 할 일</p>
                            <ul className="flex flex-col">
                              {dayTodos.map((todo) => (
                                <li
                                  key={todo.id}
                                  draggable
                                  onDragStart={(e) => handleTodoDragStart(e, todo.id, "day")}
                                  className="group cursor-grab border-b border-neutral-100 py-1.5 last:border-0 active:cursor-grabbing dark:border-neutral-800/60"
                                >
                                  <div className="mb-0.5 flex items-center gap-1.5">
                                    <div className="flex shrink-0 items-center gap-0.5">
                                      {TODO_STATUS_OPTIONS.map(({ value, symbol, className }) => {
                                        const selected = todo.status === value;
                                        return (
                                          <button
                                            key={value}
                                            type="button"
                                            onClick={() =>
                                              updateTodo(todo.id, { status: selected ? null : value })
                                            }
                                            title={value}
                                            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] leading-none ${className} ${
                                              selected ? "opacity-100" : "opacity-25 hover:opacity-60"
                                            }`}
                                          >
                                            {symbol}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <input
                                      type="time"
                                      value={todo.time ?? ""}
                                      onChange={(e) => updateTodo(todo.id, { time: e.target.value || null })}
                                      className="w-[4.2rem] shrink-0 border-none bg-transparent text-[10px] text-neutral-400 outline-none"
                                    />
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${categoryDotColor(todo.categoryId)}`}
                                      title={categories.find((c) => c.id === todo.categoryId)?.name ?? ""}
                                    />
                                  </div>
                                  {editingTodoId === todo.id ? (
                                    <input
                                      autoFocus
                                      value={editingTodoText}
                                      onChange={(e) => setEditingTodoText(e.target.value)}
                                      onBlur={() => saveTodoText(todo.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveTodoText(todo.id);
                                        if (e.key === "Escape") setEditingTodoId(null);
                                      }}
                                      className="w-full border-b border-neutral-300 bg-transparent text-[11px] text-neutral-900 outline-none dark:border-neutral-600 dark:text-neutral-50"
                                    />
                                  ) : (
                                    <p
                                      onDoubleClick={() => startEditingTodo(todo)}
                                      className={`text-[11px] leading-snug ${
                                        todo.status === "x"
                                          ? "text-neutral-300 line-through"
                                          : "text-neutral-800 dark:text-neutral-100"
                                      }`}
                                    >
                                      {todo.text}
                                    </p>
                                  )}
                                  <div className="mt-0.5 hidden justify-end gap-2 group-hover:flex">
                                    <button
                                      onClick={() => updateTodo(todo.id, { day: null, time: null })}
                                      className="text-[9px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                    >
                                      되돌리기
                                    </button>
                                    <button
                                      onClick={() => deleteTodo(todo.id)}
                                      className="text-[9px] text-neutral-400 hover:text-red-500"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-auto flex items-center justify-center gap-1 border-t border-neutral-100 py-2 dark:border-neutral-800">
                          {CONDITION_LEVELS.map(({ level, emoji, border }) => {
                            const selected = day.condition === level;
                            return (
                              <button
                                key={level}
                                onClick={() => updateDayCondition(dayIndex, selected ? null : level)}
                                title={`컨디션 ${level}`}
                                className={`inline-flex h-5 w-5 shrink-0 aspect-square items-center justify-center rounded-full border-2 bg-transparent p-0 text-sm leading-[0] overflow-hidden transition-all ${border} ${
                                  selected ? "scale-125 opacity-100" : "opacity-30 hover:opacity-70"
                                }`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="mt-6 overflow-x-auto">
                <h2 className="mb-2 text-xs font-medium text-neutral-400">일정</h2>
                <div className="min-w-[980px]">
                  {eventsThisWeek.length > 0 && (
                    <div className="mb-3 flex flex-col gap-1.5">
                      {eventsThisWeek.map((event, i) => (
                        <div key={event.id} className="grid grid-cols-7 gap-x-1">
                          <div
                            style={{ gridColumn: `${event.startDay + 1} / ${event.endDay + 2}` }}
                            className={`flex items-center justify-between gap-2 px-3 py-1 text-[11px] text-white ${EVENT_COLORS[i % EVENT_COLORS.length]} ${
                              event.continuesBefore ? "rounded-l-sm" : "rounded-l-full"
                            } ${event.continuesAfter ? "rounded-r-sm" : "rounded-r-full"}`}
                            title={`${event.startDate} ~ ${event.endDate}`}
                          >
                            <span>
                              {event.continuesBefore && "« "}
                              {event.label}
                              {event.continuesAfter && " »"}
                            </span>
                            <button onClick={() => deleteEvent(event.id)} className="opacity-70 hover:opacity-100">
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={addEvent} className="flex flex-wrap items-center gap-2 text-[11px]">
                    <input
                      type="text"
                      value={newEventLabel}
                      onChange={(e) => setNewEventLabel(e.target.value)}
                      placeholder="일정명"
                      className="w-36 border-b border-neutral-200 bg-transparent py-0.5 text-neutral-800 outline-none placeholder:text-neutral-300 focus:border-neutral-400 dark:border-neutral-800 dark:text-neutral-100"
                    />
                    <input
                      type="date"
                      value={newEventStart}
                      onChange={(e) => setNewEventStart(e.target.value)}
                      className="rounded border border-neutral-200 bg-transparent px-1 py-0.5 text-neutral-600 outline-none dark:border-neutral-800 dark:text-neutral-300"
                    />
                    <span className="text-neutral-400">~</span>
                    <input
                      type="date"
                      value={newEventEnd}
                      onChange={(e) => setNewEventEnd(e.target.value)}
                      className="rounded border border-neutral-200 bg-transparent px-1 py-0.5 text-neutral-600 outline-none dark:border-neutral-800 dark:text-neutral-300"
                    />
                    <button
                      type="submit"
                      className="rounded bg-neutral-900 px-3 py-1 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                      추가
                    </button>
                  </form>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
