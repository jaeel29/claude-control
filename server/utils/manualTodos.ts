import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// Fixed IDs for the manually-created todos session
export const MANUAL_SESSION_ID = 'cccc0000-cccc-cccc-cccc-000000000001'
export const MANUAL_AGENT_ID   = 'cccc0000-cccc-cccc-cccc-000000000002'
export const MANUAL_PROJECT    = 'claude-control (manual)'

interface ManualTodo {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

function filePath() {
  return join(
    homedir(), '.claude', 'todos',
    `${MANUAL_SESSION_ID}-agent-${MANUAL_AGENT_ID}.json`
  )
}

async function read(): Promise<ManualTodo[]> {
  try {
    return JSON.parse(await readFile(filePath(), 'utf8'))
  } catch { return [] }
}

async function write(todos: ManualTodo[]) {
  const dir = join(homedir(), '.claude', 'todos')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(filePath(), JSON.stringify(todos, null, 2), 'utf8')
}

export async function addManualTodo(content: string): Promise<ManualTodo> {
  const todos = await read()
  const todo: ManualTodo = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    content,
    status: 'pending',
  }
  todos.push(todo)
  await write(todos)
  return todo
}

export async function updateManualTodo(id: string, status: ManualTodo['status']): Promise<boolean> {
  const todos = await read()
  const item = todos.find(t => t.id === id)
  if (!item) return false
  item.status = status
  await write(todos)
  return true
}

export async function deleteManualTodo(id: string): Promise<boolean> {
  const todos = await read()
  const next = todos.filter(t => t.id !== id)
  if (next.length === todos.length) return false
  await write(next)
  return true
}

export async function getManualTodos(): Promise<ManualTodo[]> {
  return read()
}
