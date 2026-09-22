"use client";

import { useEffect, useState } from "react";

type Todo = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTodos() {
      const res = await fetch("/api/todos");
      const data = await res.json();
      setTodos(data);
      setLoading(false);
    }
    fetchTodos();
  }, []);

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setTitle("");
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    const newTodo = await res.json();
    setTodos((prev) => [newTodo, ...prev]);
  }

  async function toggleTodo(todo: Todo) {
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t))
    );
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
  }

  async function deleteTodo(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  }

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          할 일 관리
        </h1>

        <form onSubmit={addTodo} className="mb-6 flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="할 일을 입력하세요"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            추가
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-zinc-500">불러오는 중...</p>
        ) : todos.length === 0 ? (
          <p className="text-sm text-zinc-500">할 일이 없습니다.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => toggleTodo(todo)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      todo.done
                        ? "text-zinc-400 line-through"
                        : "text-black dark:text-zinc-50"
                    }`}
                  >
                    {todo.title}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-xs text-zinc-400 hover:text-red-500"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-zinc-500">
              남은 할 일 {remaining}개 / 전체 {todos.length}개
            </p>
          </>
        )}
      </main>
    </div>
  );
}
