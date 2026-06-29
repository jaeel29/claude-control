<script setup lang="ts">
import type { TaskStatus } from '~/server/utils/tasks'

// ── Live Claude Todos ──────────────────────────────────────
const MANUAL_SESSION_ID = 'cccc0000-cccc-cccc-cccc-000000000001'
const { data: todosData, refresh: refreshTodos } = useLazyFetch('/api/todos', { server: false })

async function cycleManualTodo(id: string, current: string) {
  const next = current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'completed' : 'pending'
  await $fetch(`/api/todos/${id}`, { method: 'PUT', body: { status: next } })
  await refreshTodos()
}

async function deleteManualTodo(id: string) {
  await $fetch(`/api/todos/${id}`, { method: 'DELETE' })
  await refreshTodos()
}

// ── Personal Task Board ────────────────────────────────────
const { data: tasksData, refresh: refreshTasks } = useLazyFetch('/api/tasks', { server: false })

const showAddModal = ref(false)
const modalTitle = ref('')
const modalDescription = ref('')
const modalStatus = ref<TaskStatus>('todo')
const modalDestination = ref<'board' | 'live'>('board')
const addingTask = ref(false)

function openAddModal() {
  modalTitle.value = ''
  modalDescription.value = ''
  modalStatus.value = 'todo'
  modalDestination.value = 'board'
  showAddModal.value = true
}

async function submitAddTask() {
  if (!modalTitle.value.trim()) return
  addingTask.value = true
  try {
    if (modalDestination.value === 'live') {
      await $fetch('/api/todos', {
        method: 'POST',
        body: { content: modalTitle.value.trim() },
      })
      showAddModal.value = false
      await refreshTodos()
    } else {
      await $fetch('/api/tasks', {
        method: 'POST',
        body: {
          title: modalTitle.value.trim(),
          description: modalDescription.value.trim() || undefined,
          status: modalStatus.value,
        },
      })
      showAddModal.value = false
      await refreshTasks()
    }
  } finally {
    addingTask.value = false
  }
}

async function moveTask(id: string, status: TaskStatus) {
  await $fetch(`/api/tasks/${id}`, { method: 'PUT', body: { status } })
  await refreshTasks()
}

async function removeTask(id: string) {
  await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  await refreshTasks()
}

const tasksByStatus = computed(() => {
  const all = tasksData.value?.tasks ?? []
  return {
    todo: all.filter(t => t.status === 'todo'),
    in_progress: all.filter(t => t.status === 'in_progress'),
    done: all.filter(t => t.status === 'done'),
  }
})

// ── Auto-refresh ───────────────────────────────────────────
onMounted(() => {
  const t = setInterval(() => refreshTodos(), 10_000)
  onUnmounted(() => clearInterval(t))
})

function relativeTime(ts: string) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

function statusIcon(status: string) {
  if (status === 'completed') return '✓'
  if (status === 'in_progress') return '◉'
  return '○'
}

</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Tasks</h1>
      <p class="page-subtitle">Live Claude todos and your personal task board</p>
    </div>

    <!-- ── Section 1: Live Claude Todos ── -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="live-dot"></span>
          Live Claude Todos
          <span class="section-count">{{ todosData?.sessions.length ?? 0 }}</span>
        </div>
        <span class="section-hint">auto-refreshes every 10s</span>
      </div>

      <div v-if="!todosData?.sessions.length" class="card">
        <div class="empty">
          <Icon name="lucide:check-square" size="28" style="opacity:0.3;display:block;margin:0 auto 10px" />
          No active todos found — start a Claude session to see live todos here
        </div>
      </div>

      <div v-else class="todo-sessions">
        <div v-for="session in todosData.sessions" :key="session.sessionId" class="todo-card">
          <div class="todo-card-header">
            <div class="todo-project">{{ session.project }}</div>
            <UiBadge v-if="session.isRunning" color="green" dot :pulse="true">running</UiBadge>
            <span class="todo-time">{{ relativeTime(session.lastModified) }}</span>
          </div>
          <div class="todo-list">
            <div
              v-for="(todo, i) in session.todos"
              :key="(todo as any).id ?? i"
              class="todo-item"
              :class="todo.status"
            >
              <span class="todo-icon">{{ statusIcon(todo.status) }}</span>
              <span class="todo-text">{{ todo.content }}</span>
              <template v-if="session.sessionId === MANUAL_SESSION_ID">
                <button class="todo-action" :title="`Mark ${todo.status === 'pending' ? 'in progress' : todo.status === 'in_progress' ? 'done' : 'pending'}`" @click="cycleManualTodo((todo as any).id, todo.status)">
                  <Icon name="lucide:refresh-cw" size="10" />
                </button>
                <button class="todo-action danger" title="Delete" @click="deleteManualTodo((todo as any).id)">
                  <Icon name="lucide:x" size="10" />
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Section 2: Personal Task Board ── -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          Task Board
          <span class="section-count">{{ tasksData?.tasks.length ?? 0 }}</span>
        </div>
        <UiButton variant="outline" size="small" @click="openAddModal">
          <template #icon-left><Icon name="lucide:plus" size="13" /></template>
          New Task
        </UiButton>
      </div>

      <!-- Kanban columns -->
      <div class="kanban">
        <!-- To Do -->
        <div class="kanban-col">
          <div class="kanban-col-header todo-header">
            <span class="kanban-col-dot"></span>
            To Do
            <span class="kanban-col-count">{{ tasksByStatus.todo.length }}</span>
          </div>
          <div class="kanban-cards">
            <div v-if="!tasksByStatus.todo.length" class="kanban-empty">No tasks</div>
            <div v-for="task in tasksByStatus.todo" :key="task.id" class="kanban-card">
              <div class="kanban-card-title">{{ task.title }}</div>
              <div class="kanban-card-actions">
                <button class="card-action-btn" title="Start" @click="moveTask(task.id, 'in_progress')">
                  <Icon name="lucide:play" size="12" />
                </button>
                <button class="card-action-btn danger" title="Delete" @click="removeTask(task.id)">
                  <Icon name="lucide:trash-2" size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- In Progress -->
        <div class="kanban-col">
          <div class="kanban-col-header inprogress-header">
            <span class="kanban-col-dot"></span>
            In Progress
            <span class="kanban-col-count">{{ tasksByStatus.in_progress.length }}</span>
          </div>
          <div class="kanban-cards">
            <div v-if="!tasksByStatus.in_progress.length" class="kanban-empty">No tasks</div>
            <div v-for="task in tasksByStatus.in_progress" :key="task.id" class="kanban-card">
              <div class="kanban-card-title">{{ task.title }}</div>
              <div class="kanban-card-actions">
                <button class="card-action-btn" title="Move back" @click="moveTask(task.id, 'todo')">
                  <Icon name="lucide:arrow-left" size="12" />
                </button>
                <button class="card-action-btn success" title="Done" @click="moveTask(task.id, 'done')">
                  <Icon name="lucide:check" size="12" />
                </button>
                <button class="card-action-btn danger" title="Delete" @click="removeTask(task.id)">
                  <Icon name="lucide:trash-2" size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Done -->
        <div class="kanban-col">
          <div class="kanban-col-header done-header">
            <span class="kanban-col-dot"></span>
            Done
            <span class="kanban-col-count">{{ tasksByStatus.done.length }}</span>
          </div>
          <div class="kanban-cards">
            <div v-if="!tasksByStatus.done.length" class="kanban-empty">No tasks</div>
            <div v-for="task in tasksByStatus.done" :key="task.id" class="kanban-card done-card">
              <div class="kanban-card-title">{{ task.title }}</div>
              <div class="kanban-card-actions">
                <button class="card-action-btn" title="Reopen" @click="moveTask(task.id, 'todo')">
                  <Icon name="lucide:rotate-ccw" size="12" />
                </button>
                <button class="card-action-btn danger" title="Delete" @click="removeTask(task.id)">
                  <Icon name="lucide:trash-2" size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- ── Add Task Modal ── -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <h2 class="modal-title">New Task</h2>
            <button class="modal-close" @click="showAddModal = false">
              <Icon name="lucide:x" size="16" />
            </button>
          </div>

          <div class="modal-body">
            <!-- Destination toggle -->
            <div class="dest-toggle">
              <button
                class="dest-btn"
                :class="{ active: modalDestination === 'board' }"
                @click="modalDestination = 'board'"
              >
                <Icon name="lucide:layout-grid" size="13" />
                Task Board
              </button>
              <button
                class="dest-btn live"
                :class="{ active: modalDestination === 'live' }"
                @click="modalDestination = 'live'"
              >
                <span class="dest-live-dot"></span>
                Live Todo
              </button>
            </div>

            <div class="field">
              <label class="field-label">Title <span class="required">*</span></label>
              <input
                v-model="modalTitle"
                class="field-input"
                placeholder="What needs to be done?"
                autofocus
                @keydown.enter.prevent="submitAddTask"
                @keydown.esc="showAddModal = false"
              />
            </div>

            <div v-if="modalDestination === 'board'" class="field">
              <label class="field-label">Description <span class="optional">optional</span></label>
              <textarea
                v-model="modalDescription"
                class="field-textarea"
                placeholder="Add more context…"
                rows="3"
              />
            </div>

            <div v-if="modalDestination === 'board'" class="field">
              <label class="field-label">Initial Status</label>
              <div class="status-options">
                <label
                  v-for="opt in [
                    { value: 'todo', label: 'To Do', color: 'muted' },
                    { value: 'in_progress', label: 'In Progress', color: 'accent' },
                    { value: 'done', label: 'Done', color: 'green' },
                  ]"
                  :key="opt.value"
                  class="status-option"
                  :class="[opt.color, { selected: modalStatus === opt.value }]"
                >
                  <input v-model="modalStatus" type="radio" :value="opt.value" class="sr-only" />
                  {{ opt.label }}
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <UiButton variant="outline" size="medium" @click="showAddModal = false">Cancel</UiButton>
            <UiButton
              variant="neutral"
              size="medium"
              :disabled="addingTask || !modalTitle.trim()"
              @click="submitAddTask"
            >
              <template #icon-left><Icon name="lucide:plus" size="14" /></template>
              {{ addingTask ? 'Creating…' : 'Create Task' }}
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Page header ── */
.page-header { margin-bottom: 28px; }
.page-title { font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }

/* ── Section ── */
.section { margin-bottom: 32px; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1px 8px;
}
.section-hint { font-size: 11px; color: var(--text-muted); }

/* ── Card / Empty ── */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.empty {
  text-align: center;
  padding: 52px 20px;
  color: var(--text-muted);
  font-size: 13px;
}

/* ── Live dot / Running badge ── */
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 2s infinite;
  display: inline-block;
}
/* ── Todo sessions ── */
.todo-sessions { display: flex; flex-direction: column; gap: 10px; }
.todo-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
}
.todo-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.todo-project {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.todo-time { font-size: 11px; color: var(--text-muted); }
.todo-list { display: flex; flex-direction: column; gap: 6px; }
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 13px;
  line-height: 1.5;
  padding: 6px 10px;
  border-radius: var(--radius-xs);
}
.todo-item.pending { color: var(--text-secondary); background: var(--bg-surface); }
.todo-item.in_progress { color: var(--accent); background: var(--accent-dim); border: 1px solid var(--accent-border); }
.todo-item.completed { color: var(--text-muted); text-decoration: line-through; }
.todo-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; font-family: monospace; }
.todo-text { flex: 1; }
.todo-action {
  width: 20px; height: 20px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.12s, background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.todo-item:hover .todo-action { opacity: 1; }
.todo-action:hover { background: var(--bg-card); border-color: var(--border); color: var(--text-secondary); }
.todo-action.danger:hover { color: var(--red); border-color: rgba(239,68,68,0.3); background: var(--red-dim); }

/* ── New Task button ── */
.new-task-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}
.new-task-btn:hover { opacity: 0.88; }

/* ── Destination toggle ── */
.dest-toggle {
  display: flex;
  gap: 6px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px;
}
.dest-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  border-radius: calc(var(--radius-sm) - 2px);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.dest-btn.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}
.dest-btn.live.active { color: var(--accent); }
.dest-live-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(1, 44, 50, 0.4);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}
.modal-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border-light);
}
.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, color 0.12s;
}
.modal-close:hover { background: var(--bg-surface); color: var(--text-primary); }
.modal-body {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 5px;
}
.required { color: var(--red); }
.optional { color: var(--text-muted); font-weight: 400; font-size: 10px; }
.field-input,
.field-textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field-textarea { resize: vertical; line-height: 1.5; }
.field-input::placeholder,
.field-textarea::placeholder { color: var(--text-muted); }
.field-input:focus,
.field-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
.status-options { display: flex; gap: 6px; }
.status-option {
  flex: 1;
  text-align: center;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-muted);
  background: var(--bg-surface);
  transition: all 0.15s;
  user-select: none;
}
.status-option.muted.selected { color: var(--text-primary); background: var(--bg-card); border-color: var(--text-muted); }
.status-option.accent.selected { color: var(--accent); background: var(--accent-dim); border-color: var(--accent-border); }
.status-option.green.selected { color: var(--green); background: var(--green-dim); border-color: rgba(16,185,129,0.3); }
.status-option:hover:not(.selected) { border-color: var(--accent-border); color: var(--text-secondary); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px 20px;
  border-top: 1px solid var(--border-light);
}
.btn-cancel {
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
}
.btn-cancel:hover { background: var(--bg-surface); }
.btn-create {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-create:hover:not(:disabled) { opacity: 0.88; }
.btn-create:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Modal transition ── */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .modal-box,
.modal-fade-leave-active .modal-box { transition: transform 0.18s ease, opacity 0.18s ease; }
.modal-fade-enter-from .modal-box { transform: translateY(12px) scale(0.97); opacity: 0; }
.modal-fade-leave-to .modal-box { transform: translateY(6px) scale(0.98); opacity: 0; }

/* ── Kanban ── */
.kanban {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.kanban-col {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  min-height: 160px;
}
.kanban-col-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-secondary);
}
.kanban-col-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.todo-header .kanban-col-dot { background: var(--text-muted); }
.inprogress-header .kanban-col-dot { background: var(--accent); }
.done-header .kanban-col-dot { background: var(--green); }
.todo-header { color: var(--text-secondary); }
.inprogress-header { color: var(--accent); }
.done-header { color: var(--green); }
.kanban-col-count {
  margin-left: auto;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 6px;
}
.kanban-cards { display: flex; flex-direction: column; gap: 6px; }
.kanban-empty { font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px 0; }
.kanban-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.done-card { opacity: 0.6; }
.kanban-card-title {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
}
.kanban-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
.card-action-btn {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.card-action-btn:hover { background: var(--bg-surface); color: var(--text-primary); border-color: var(--border); }
.card-action-btn.success:hover { color: var(--green); border-color: rgba(16,185,129,0.3); background: var(--green-dim); }
.card-action-btn.danger:hover { color: var(--red); border-color: rgba(239,68,68,0.3); background: var(--red-dim); }

/* ── Session log ── */
.log-list { display: flex; flex-direction: column; gap: 6px; }
.log-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s;
}
.log-item.expanded { border-color: var(--accent-border); }
.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  gap: 12px;
  transition: background 0.12s;
}
.log-header:hover { background: var(--bg-surface); }
.log-header-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.log-project { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.log-session-id {
  font-size: 10px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 6px;
}
.log-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.log-chips { display: flex; gap: 5px; }
.log-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 20px;
  border: 1px solid var(--border);
}
.log-chip.edited { color: var(--accent); background: var(--accent-dim); border-color: var(--accent-border); }
.log-chip.written { color: var(--green); background: var(--green-dim); border-color: rgba(16,185,129,0.2); }
.log-chip.commands { color: var(--text-secondary); background: var(--bg-surface); }
.log-chip.agents { color: var(--blue); background: var(--blue-dim); border-color: rgba(59,130,246,0.2); }
.log-time { font-size: 11px; color: var(--text-muted); }
.log-chevron { color: var(--text-muted); transition: transform 0.2s; flex-shrink: 0; }

/* ── Log detail ── */
.log-detail {
  padding: 0 16px 14px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 14px;
}
.log-detail-group {}
.log-detail-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.log-file-list { display: flex; flex-wrap: wrap; gap: 5px; }
.log-file {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: 4px;
  padding: 2px 7px;
}
.log-cmd-list { display: flex; flex-direction: column; gap: 4px; }
.log-cmd {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.log-tool-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.log-tool-chip {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2px 8px;
}
.log-tool-chip strong { color: var(--text-primary); margin-left: 3px; }
.log-cwd {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted);
  display: block;
  word-break: break-all;
}
</style>
