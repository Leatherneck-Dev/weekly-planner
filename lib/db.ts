import { promises as fs } from "fs";
import path from "path";

export type Todo = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

const DB_PATH = path.join(process.cwd(), "data", "todos.json");

async function ensureDbFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, "[]", "utf-8");
  }
}

async function readTodos(): Promise<Todo[]> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as Todo[];
}

async function writeTodos(todos: Todo[]) {
  await fs.writeFile(DB_PATH, JSON.stringify(todos, null, 2), "utf-8");
}

export async function getTodos(): Promise<Todo[]> {
  const todos = await readTodos();
  return todos.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addTodo(title: string): Promise<Todo> {
  const todos = await readTodos();
  const nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const todo: Todo = {
    id: nextId,
    title,
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  await writeTodos(todos);
  return todo;
}

export async function updateTodo(
  id: number,
  updates: { title?: string; done?: boolean }
): Promise<Todo | null> {
  const todos = await readTodos();
  const todo = todos.find((t) => t.id === id);
  if (!todo) return null;
  if (updates.title !== undefined) todo.title = updates.title;
  if (updates.done !== undefined) todo.done = updates.done;
  await writeTodos(todos);
  return todo;
}

export async function deleteTodo(id: number): Promise<void> {
  const todos = await readTodos();
  await writeTodos(todos.filter((t) => t.id !== id));
}
