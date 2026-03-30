import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const TASKS_FILE = join(homedir(), '.claude', 'control-tasks.json')

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export async function readTasks(): Promise<Task[]> {
  if (!existsSync(TASKS_FILE)) return []
  try {
    const raw = await readFile(TASKS_FILE, 'utf8')
    return JSON.parse(raw) as Task[]
  } catch { return [] }
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8')
}

export async function createTask(title: string, description?: string, status: TaskStatus = 'todo'): Promise<Task> {
  const tasks = await readTasks()
  const now = new Date().toISOString()
  const task: Task = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    description,
    status,
    createdAt: now,
    updatedAt: now,
  }
  tasks.push(task)
  await writeTasks(tasks)
  return task
}

export async function updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'description' | 'status'>>): Promise<Task | null> {
  const tasks = await readTasks()
  const idx = tasks.findIndex(t => t.id === id)
  if (idx === -1) return null
  tasks[idx] = { ...tasks[idx], ...patch, updatedAt: new Date().toISOString() }
  await writeTasks(tasks)
  return tasks[idx]
}

export async function deleteTask(id: string): Promise<boolean> {
  const tasks = await readTasks()
  const filtered = tasks.filter(t => t.id !== id)
  if (filtered.length === tasks.length) return false
  await writeTasks(filtered)
  return true
}
