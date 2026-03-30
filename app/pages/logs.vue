<script setup lang="ts">
const { data: logData, refresh: refreshLog } = await useFetch('/api/sessionlog')

const expandedSession = ref<string | null>(null)
function toggleSession(id: string) {
  expandedSession.value = expandedSession.value === id ? null : id
}

onMounted(() => {
  const t = setInterval(() => refreshLog(), 15_000)
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

function topTools(toolCalls: Record<string, number>) {
  return Object.entries(toolCalls).sort((a, b) => b[1] - a[1]).slice(0, 5)
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Session Logs</h1>
        <p class="page-subtitle">Tool call summaries across all Claude sessions</p>
      </div>
      <div class="page-header-right">
        <span class="total-badge">{{ logData?.sessions.length ?? 0 }} sessions</span>
        <span class="refresh-hint">auto-refreshes every 15s</span>
      </div>
    </div>

    <div v-if="!logData?.sessions.length" class="card">
      <div class="empty">
        <Icon name="lucide:terminal" size="32" style="opacity:0.25;display:block;margin:0 auto 12px" />
        No session logs found
      </div>
    </div>

    <div v-else class="log-list">
      <div
        v-for="session in logData.sessions"
        :key="session.sessionId"
        class="log-item"
        :class="{ expanded: expandedSession === session.sessionId }"
      >
        <div class="log-header" @click="toggleSession(session.sessionId)">
          <div class="log-header-left">
            <span v-if="session.isRunning" class="running-badge">
              <span class="running-dot"></span>running
            </span>
            <span class="log-project">{{ session.project }}</span>
            <span class="log-session-id">{{ session.sessionId.slice(0, 8) }}</span>
          </div>
          <div class="log-header-right">
            <div class="log-chips">
              <span v-if="session.filesEdited.length" class="log-chip edited">
                <Icon name="lucide:file-edit" size="10" /> {{ session.filesEdited.length }} edited
              </span>
              <span v-if="session.filesWritten.length" class="log-chip written">
                <Icon name="lucide:file-plus" size="10" /> {{ session.filesWritten.length }} written
              </span>
              <span v-if="session.commandsRun.length" class="log-chip commands">
                <Icon name="lucide:terminal" size="10" /> {{ session.commandsRun.length }} cmds
              </span>
              <span v-if="session.agentsSpawned" class="log-chip agents">
                <Icon name="lucide:bot" size="10" /> {{ session.agentsSpawned }} agents
              </span>
            </div>
            <span class="log-time">{{ relativeTime(session.lastActiveAt) }}</span>
            <Icon
              name="lucide:chevron-right"
              size="14"
              class="log-chevron"
              :style="{ transform: expandedSession === session.sessionId ? 'rotate(90deg)' : 'none' }"
            />
          </div>
        </div>

        <div v-if="expandedSession === session.sessionId" class="log-detail">
          <div v-if="session.filesEdited.length" class="log-detail-group">
            <div class="log-detail-label">Files Edited</div>
            <div class="log-file-list">
              <code v-for="f in session.filesEdited" :key="f" class="log-file">{{ f.split('/').slice(-2).join('/') }}</code>
            </div>
          </div>
          <div v-if="session.filesWritten.length" class="log-detail-group">
            <div class="log-detail-label">Files Written</div>
            <div class="log-file-list">
              <code v-for="f in session.filesWritten" :key="f" class="log-file">{{ f.split('/').slice(-2).join('/') }}</code>
            </div>
          </div>
          <div v-if="session.commandsRun.length" class="log-detail-group">
            <div class="log-detail-label">Commands</div>
            <div class="log-cmd-list">
              <code v-for="(cmd, i) in session.commandsRun.slice(0, 10)" :key="i" class="log-cmd">{{ cmd }}</code>
            </div>
          </div>
          <div class="log-detail-group">
            <div class="log-detail-label">Tool Usage</div>
            <div class="log-tool-chips">
              <span v-for="[tool, count] in topTools(session.toolCalls)" :key="tool" class="log-tool-chip">
                {{ tool }} <strong>{{ count }}</strong>
              </span>
            </div>
          </div>
          <div v-if="session.cwd" class="log-detail-group">
            <div class="log-detail-label">Working Directory</div>
            <code class="log-cwd">{{ session.cwd }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Page header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.page-title { font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }
.page-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 4px;
}
.total-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 10px;
}
.refresh-hint { font-size: 11px; color: var(--text-muted); }

/* ── Card / Empty ── */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}
.empty {
  text-align: center;
  padding: 72px 20px;
  color: var(--text-muted);
  font-size: 13px;
}

/* ── Running badge ── */
.running-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--green);
  background: var(--green-dim);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 20px;
  padding: 2px 7px;
}
.running-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

/* ── Log list ── */
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
  padding: 14px 18px;
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
  padding: 16px 18px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.log-detail-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  margin-bottom: 7px;
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
  padding: 5px 9px;
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
  padding: 2px 9px;
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
