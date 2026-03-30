<script setup lang="ts">
// ── Projects for selector ──────────────────────────────────
const { data: projectsData } = await useFetch('/api/projects')

const availableProjects = computed(() =>
  (projectsData.value?.projects ?? []).filter(p => p.path)
)

// ── Form state ─────────────────────────────────────────────
const selectedProject = ref<{ name: string; path: string } | null>(null)
const customCwd = ref('')
const useCustomCwd = ref(false)
const prompt = ref('')
const running = ref(false)
const runId = ref<string | null>(null)

// Set default project on load
watch(availableProjects, (projects) => {
  if (projects.length && !selectedProject.value) {
    const first = projects[0]
    if (first?.name && first?.path) {
      selectedProject.value = { name: first.name, path: first.path }
    }
  }
}, { once: true, immediate: true })

const activeCwd = computed(() =>
  useCustomCwd.value ? customCwd.value.trim() : selectedProject.value?.path ?? ''
)
const activeProject = computed(() =>
  useCustomCwd.value ? customCwd.value.split('/').pop() ?? 'project' : selectedProject.value?.name ?? ''
)

// ── Output ────────────────────────────────────────────────
interface OutputLine {
  type: 'text' | 'tool' | 'result' | 'error' | 'system' | 'done'
  content: string
  toolName?: string
  toolInput?: string
  exitCode?: number
  cost?: number
}

const output = ref<OutputLine[]>([])
const terminalEl = ref<HTMLElement | null>(null)
let eventSource: EventSource | null = null

function scrollToBottom() {
  nextTick(() => {
    if (terminalEl.value) terminalEl.value.scrollTop = terminalEl.value.scrollHeight
  })
}

function parseLine(raw: string) {
  try {
    const e = JSON.parse(raw)

    if (e.type === 'system' && e.subtype === 'init') {
      output.value.push({ type: 'system', content: `Session ${e.session_id?.slice(0, 8) ?? ''}  •  ${e.tools?.length ?? 0} tools available` })

    } else if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
      for (const block of e.message.content) {
        if (block.type === 'text' && block.text?.trim()) {
          output.value.push({ type: 'text', content: block.text.trim() })
        } else if (block.type === 'tool_use') {
          const inp = block.input ?? {}
          const detail =
            inp.file_path ? inp.file_path.split('/').slice(-2).join('/') :
            inp.command   ? String(inp.command).slice(0, 60) :
            inp.prompt    ? String(inp.prompt).slice(0, 60) :
            JSON.stringify(inp).slice(0, 60)
          output.value.push({ type: 'tool', content: detail, toolName: block.name })
        }
      }

    } else if (e.type === 'result') {
      const cost = e.usage?.cost_usd
      if (e.result?.trim()) output.value.push({ type: 'result', content: e.result.trim(), cost })

    } else if (e.type === 'stderr') {
      if (e.text?.trim()) output.value.push({ type: 'error', content: e.text.trim() })

    } else if (e.type === 'done') {
      output.value.push({ type: 'done', content: e.code === 0 ? 'Completed successfully' : `Exited with code ${e.code}`, exitCode: e.code ?? 0 })
      running.value = false
      eventSource?.close()
    }
  } catch {
    if (raw.trim()) output.value.push({ type: 'text', content: raw })
  }
  scrollToBottom()
}

async function startRun() {
  if (!prompt.value.trim() || !activeCwd.value || running.value) return

  output.value = []
  running.value = true
  runId.value = null
  eventSource?.close()

  try {
    const res = await $fetch<{ runId: string }>('/api/run', {
      method: 'POST',
      body: { prompt: prompt.value.trim(), cwd: activeCwd.value, project: activeProject.value },
    })
    runId.value = res.runId

    eventSource = new EventSource(`/api/run/${res.runId}/stream`)
    eventSource.onmessage = (e) => parseLine(e.data)
    eventSource.onerror = () => {
      if (running.value) {
        output.value.push({ type: 'error', content: 'Stream connection lost' })
        running.value = false
      }
      eventSource?.close()
    }
  } catch (err: any) {
    output.value.push({ type: 'error', content: err?.data?.message ?? String(err) })
    running.value = false
  }
}

async function stopRun() {
  if (!runId.value) return
  await $fetch(`/api/run/${runId.value}/kill`, { method: 'POST' })
  running.value = false
  eventSource?.close()
  output.value.push({ type: 'done', content: 'Stopped by user', exitCode: -1 })
}

function clearOutput() {
  output.value = []
}

onUnmounted(() => eventSource?.close())

// ── Helpers ───────────────────────────────────────────────
const toolIcons: Record<string, string> = {
  Read: '📖', Write: '✏️', Edit: '✏️', MultiEdit: '✏️',
  Bash: '⚡', Glob: '🔍', Grep: '🔍', Agent: '🤖',
  WebFetch: '🌐', WebSearch: '🌐', TodoWrite: '📋', TodoRead: '📋',
}
function toolIcon(name: string) { return toolIcons[name] ?? '🔧' }
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Run</h1>
        <p class="page-subtitle">Start a Claude Code task in any project</p>
      </div>
      <span v-if="running" class="running-pill">
        <span class="running-dot"></span>Running
      </span>
    </div>

    <!-- ── Config panel ── -->
    <div class="config-card">
      <!-- Project selector -->
      <div class="config-row">
        <label class="config-label">Project</label>
        <div class="project-selector">
          <div
            v-for="proj in availableProjects"
            :key="proj.path"
            class="project-chip"
            :class="{ active: !useCustomCwd && selectedProject?.path === proj.path }"
            @click="useCustomCwd = false; selectedProject = { name: proj.name, path: proj.path! }"
          >
            <span v-if="proj.sessionCount > 0" class="proj-dot"></span>
            {{ proj.name }}
          </div>
          <div
            class="project-chip custom-chip"
            :class="{ active: useCustomCwd }"
            @click="useCustomCwd = true"
          >
            <Icon name="lucide:folder-plus" size="11" />
            Custom
          </div>
        </div>
      </div>

      <!-- Custom CWD input -->
      <div v-if="useCustomCwd" class="config-row">
        <label class="config-label">Directory</label>
        <input
          v-model="customCwd"
          class="cwd-input"
          placeholder="/path/to/your/project"
        />
      </div>

      <!-- Active path display -->
      <div v-if="activeCwd" class="config-row">
        <label class="config-label">Path</label>
        <code class="active-path">{{ activeCwd }}</code>
      </div>

      <!-- Prompt -->
      <div class="config-row prompt-row">
        <label class="config-label">Prompt</label>
        <div class="prompt-wrap">
          <textarea
            v-model="prompt"
            class="prompt-input"
            placeholder="Describe what you want Claude to do…&#10;e.g. Fix the login bug in server/api/auth.ts and add a unit test"
            rows="4"
            :disabled="running"
            @keydown.meta.enter="startRun"
          />
          <span class="prompt-hint">⌘↵ to run</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="config-actions">
        <button
          v-if="!running"
          class="btn-run"
          :disabled="!prompt.trim() || !activeCwd"
          @click="startRun"
        >
          <Icon name="lucide:play" size="14" />
          Run with Claude
        </button>
        <button v-else class="btn-stop" @click="stopRun">
          <Icon name="lucide:square" size="14" />
          Stop
        </button>
        <button v-if="output.length" class="btn-clear" :disabled="running" @click="clearOutput">
          <Icon name="lucide:trash-2" size="13" />
          Clear
        </button>
      </div>
    </div>

    <!-- ── Terminal output ── -->
    <div v-if="output.length" class="terminal" ref="terminalEl">
      <template v-for="(line, i) in output" :key="i">

        <!-- system init -->
        <div v-if="line.type === 'system'" class="line line-system">
          <Icon name="lucide:terminal" size="11" class="line-icon" />
          {{ line.content }}
        </div>

        <!-- assistant text -->
        <div v-else-if="line.type === 'text'" class="line line-text">
          <span class="line-prefix">›</span>
          <span class="line-body">{{ line.content }}</span>
        </div>

        <!-- tool call -->
        <div v-else-if="line.type === 'tool'" class="line line-tool">
          <span class="tool-badge">
            <span class="tool-icon">{{ toolIcon(line.toolName!) }}</span>
            <span class="tool-name">{{ line.toolName }}</span>
          </span>
          <span class="tool-detail">{{ line.content }}</span>
        </div>

        <!-- final result -->
        <div v-else-if="line.type === 'result'" class="line line-result">
          <div class="result-header">
            <Icon name="lucide:check-circle" size="12" />
            Result
            <span v-if="line.cost" class="result-cost">${{ line.cost.toFixed(4) }}</span>
          </div>
          <div class="result-body">{{ line.content }}</div>
        </div>

        <!-- error -->
        <div v-else-if="line.type === 'error'" class="line line-error">
          <Icon name="lucide:alert-circle" size="11" class="line-icon" />
          {{ line.content }}
        </div>

        <!-- done -->
        <div v-else-if="line.type === 'done'" class="line line-done" :class="{ failed: (line.exitCode ?? 0) > 0 }">
          <Icon :name="(line.exitCode ?? 0) === 0 ? 'lucide:check' : 'lucide:x'" size="11" class="line-icon" />
          {{ line.content }}
        </div>

      </template>

      <!-- blinking cursor while running -->
      <div v-if="running" class="cursor-line">
        <span class="cursor">▋</span>
      </div>
    </div>

    <!-- empty state -->
    <div v-else class="empty-terminal">
      <Icon name="lucide:terminal" size="32" style="opacity:0.15;display:block;margin:0 auto 12px" />
      Output will appear here once you run a task
    </div>
  </div>
</template>

<style scoped>
/* ── Page ── */
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }
.running-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 20px;
  background: var(--accent-dim); border: 1px solid var(--accent-border);
  color: var(--accent); font-size: 12px; font-weight: 600;
  flex-shrink: 0; margin-top: 4px;
}
.running-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent); animation: pulse 1.2s infinite;
}

/* ── Config card ── */
.config-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 22px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.config-row { display: flex; align-items: flex-start; gap: 14px; }
.config-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--text-muted); padding-top: 2px; width: 64px; flex-shrink: 0;
}

/* ── Project chips ── */
.project-selector { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.project-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 12px; border-radius: 20px;
  border: 1px solid var(--border); background: var(--bg-surface);
  font-size: 12px; font-weight: 500; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s; user-select: none;
}
.project-chip:hover { border-color: var(--accent-border); color: var(--text-primary); }
.project-chip.active {
  background: var(--accent-dim); border-color: var(--accent-border);
  color: var(--accent); font-weight: 600;
}
.proj-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--green); animation: pulse 2s infinite; flex-shrink: 0;
}
.custom-chip { font-style: italic; }

/* ── CWD input ── */
.cwd-input {
  flex: 1; height: 34px; padding: 0 12px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-surface); color: var(--text-primary);
  font-size: 12px; font-family: 'SF Mono', 'Fira Code', monospace;
  outline: none; transition: border-color 0.15s, box-shadow 0.15s;
}
.cwd-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.active-path {
  font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px;
  color: var(--text-muted); word-break: break-all;
}

/* ── Prompt ── */
.prompt-row { align-items: flex-start; }
.prompt-wrap { flex: 1; position: relative; }
.prompt-input {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-surface); color: var(--text-primary);
  font-size: 13px; font-family: inherit; resize: vertical;
  outline: none; line-height: 1.6; box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.prompt-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.prompt-input::placeholder { color: var(--text-muted); }
.prompt-input:disabled { opacity: 0.5; }
.prompt-hint {
  position: absolute; bottom: 8px; right: 10px;
  font-size: 10px; color: var(--text-muted); pointer-events: none;
}

/* ── Actions ── */
.config-actions { display: flex; gap: 8px; padding-top: 2px; }
.btn-run {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 18px;
  background: var(--accent); color: #fff; border: none;
  border-radius: var(--radius-sm); font-size: 13px; font-weight: 500;
  font-family: inherit; cursor: pointer; transition: opacity 0.15s;
}
.btn-run:hover:not(:disabled) { opacity: 0.88; }
.btn-run:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-stop {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 18px;
  background: var(--red-dim); color: var(--red);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: var(--radius-sm); font-size: 13px; font-weight: 500;
  font-family: inherit; cursor: pointer; transition: opacity 0.15s;
}
.btn-stop:hover { opacity: 0.85; }
.btn-clear {
  display: inline-flex; align-items: center; gap: 5px;
  height: 36px; padding: 0 14px;
  background: transparent; color: var(--text-muted);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s;
}
.btn-clear:hover:not(:disabled) { color: var(--text-primary); border-color: var(--text-muted); }
.btn-clear:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── Terminal ── */
.terminal {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: var(--radius);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 520px;
  overflow-y: auto;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12.5px;
  line-height: 1.7;
  scroll-behavior: smooth;
}
.terminal::-webkit-scrollbar { width: 6px; }
.terminal::-webkit-scrollbar-track { background: transparent; }
.terminal::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }

.line { display: flex; align-items: flex-start; gap: 8px; }
.line-icon { flex-shrink: 0; margin-top: 3px; opacity: 0.5; }

.line-system { color: #484f58; font-size: 11px; padding: 4px 0; }

.line-text { color: #e6edf3; }
.line-prefix { color: #3fb950; flex-shrink: 0; font-weight: 700; }
.line-body { white-space: pre-wrap; word-break: break-word; }

.line-tool {
  display: flex; align-items: center; gap: 8px;
  padding: 3px 8px; border-radius: 5px;
  background: rgba(31, 111, 235, 0.08);
  border-left: 2px solid #1f6feb;
  margin: 1px 0;
}
.tool-badge {
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
}
.tool-icon { font-size: 11px; }
.tool-name { color: #79c0ff; font-size: 11px; font-weight: 600; }
.tool-detail { color: #8b949e; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.line-result {
  background: rgba(63, 185, 80, 0.08);
  border: 1px solid rgba(63, 185, 80, 0.2);
  border-radius: 6px;
  padding: 10px 12px;
  margin: 6px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.result-header {
  display: flex; align-items: center; gap: 6px;
  color: #3fb950; font-size: 11px; font-weight: 600;
}
.result-cost {
  margin-left: auto; color: #484f58; font-weight: 400;
}
.result-body { color: #e6edf3; white-space: pre-wrap; word-break: break-word; }

.line-error { color: #f85149; }
.line-error .line-icon { color: #f85149; }

.line-done {
  display: flex; align-items: center; gap: 6px;
  color: #3fb950; font-size: 11px; padding: 6px 0 2px;
  border-top: 1px solid #21262d; margin-top: 6px;
}
.line-done.failed { color: #f85149; }
.line-done .line-icon { color: inherit; }

.cursor-line { padding: 2px 0; }
.cursor {
  color: #3fb950;
  animation: blink 1s step-end infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* ── Empty state ── */
.empty-terminal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 72px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
