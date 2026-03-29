<script setup lang="ts">
interface ActivityItem {
  role: 'user' | 'assistant'
  text: string
  fullText: string
  timestamp: string
  project: string
  sessionId: string
  messageId?: string
}

interface Session {
  pid: number
  cwd: string
  project: string
  mode: string
  elapsed: string
  sessionId: string | null
  resume: boolean
  settingSources: string
  args: string[]
}

const { data, refresh } = await useFetch('/api/home')

onMounted(() => {
  const t = setInterval(refresh, 10_000)
  onUnmounted(() => clearInterval(t))
})

// Modal state
const selectedSession = ref<Session | null>(null)
const showModal = ref(false)

function openSession(s: Session) {
  selectedSession.value = s
  showModal.value = true
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

const selectedActivity = ref<ActivityItem | null>(null)
const showActivityModal = ref(false)

function openActivity(item: ActivityItem) {
  selectedActivity.value = item
  showActivityModal.value = true
}

function fullDate(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function modeColor(mode: string) {
  if (mode === 'acceptEdits') return 'var(--accent)'
  if (mode === 'bypassPermissions') return 'var(--red)'
  return 'var(--text-secondary)'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Overview</h1>
      <p class="page-subtitle">Live status of your Claude Code sessions and agents</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ data?.stats.running ?? 0 }}</div>
        <div class="stat-label">
          <span class="stat-dot" style="background: var(--green)"></span>
          Running Sessions
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ data?.stats.totalAgents ?? 0 }}</div>
        <div class="stat-label">
          <span class="stat-dot" style="background: var(--accent)"></span>
          Total Agents
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ data?.stats.globalAgents ?? 0 }}</div>
        <div class="stat-label">
          <span class="stat-dot" style="background: var(--blue)"></span>
          Global Agents
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ data?.stats.projects ?? 0 }}</div>
        <div class="stat-label">
          <span class="stat-dot" style="background: var(--yellow)"></span>
          Projects Tracked
        </div>
      </div>
    </div>

    <!-- Running Sessions -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          Running Sessions
          <span class="section-count">{{ data?.sessions.length ?? 0 }}</span>
        </div>
        <span style="font-size:11px;color:var(--text-muted);">Click a row for details</span>
      </div>

      <div v-if="!data?.sessions.length" class="card">
        <div class="empty">
          <div class="empty-icon">◎</div>
          No active Claude sessions detected
        </div>
      </div>

      <div v-else class="card">
        <div
          v-for="s in data?.sessions"
          :key="s.pid"
          class="card-row session-row"
          @click="openSession(s)"
        >
          <span class="status online">
            <span class="status-dot"></span>
            Active
          </span>
          <div class="session-info">
            <div class="session-project">{{ s.project || `PID ${s.pid}` }}</div>
            <div class="session-mode" :style="{ color: modeColor(s.mode) }">
              {{ s.mode }}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="session-time">{{ s.elapsed }}</div>
            <span style="color:var(--text-muted);font-size:12px">›</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">Recent Activity</div>
      </div>

      <div v-if="!data?.activity.length" class="card">
        <div class="empty">
          <div class="empty-icon">◈</div>
          No recent activity found
        </div>
      </div>

      <div class="activity-list">
        <div
          v-for="(item, i) in data?.activity"
          :key="i"
          class="activity-item activity-clickable"
          @click="openActivity(item)"
        >
          <div :class="['activity-role', item.role]">{{ item.role }}</div>
          <div class="activity-content">
            <div class="activity-text">{{ item.text }}</div>
          </div>
          <div class="activity-right">
            <span class="activity-project-badge">{{ item.project }}</span>
            <span class="activity-time">{{ relativeTime(item.timestamp) }}</span>
            <span style="color:var(--text-muted);font-size:12px">›</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Detail Modal -->
    <Modal
      v-model="showActivityModal"
      :title="selectedActivity?.role === 'user' ? 'User Message' : 'Assistant Response'"
    >
      <div v-if="selectedActivity">
        <div class="detail-grid" style="margin-bottom:16px">
          <div class="detail-row">
            <span class="detail-label">Role</span>
            <span
              class="activity-role"
              :class="selectedActivity.role"
              style="font-size:10px;padding:2px 8px;border-radius:4px"
            >{{ selectedActivity.role }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Project</span>
            <code class="detail-code">{{ selectedActivity.project }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-value">{{ fullDate(selectedActivity.timestamp) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Session ID</span>
            <code class="detail-code" style="font-size:10px">{{ selectedActivity.sessionId || '—' }}</code>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-section-label">Full Message</div>
          <div class="message-body">{{ selectedActivity.fullText }}</div>
        </div>
      </div>
    </Modal>

    <!-- Session Detail Modal -->
    <Modal v-model="showModal" :title="`Session · ${selectedSession?.project || 'Unknown'}`">
      <template v-if="selectedSession">

        <!-- Key info rows -->
        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="status online" style="font-size:11px;padding:2px 8px">
              <span class="status-dot"></span>Active
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">PID</span>
            <code class="detail-code">{{ selectedSession.pid }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Permission Mode</span>
            <code class="detail-code" :style="{ color: modeColor(selectedSession.mode) }">
              {{ selectedSession.mode }}
            </code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Elapsed</span>
            <span class="detail-value">{{ selectedSession.elapsed }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Session ID</span>
            <code class="detail-code" style="font-size:10px">
              {{ selectedSession.sessionId ?? 'new session' }}
            </code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Resuming</span>
            <span class="detail-value">{{ selectedSession.resume ? 'Yes' : 'No' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Settings</span>
            <code class="detail-code">{{ selectedSession.settingSources || '—' }}</code>
          </div>
        </div>

        <!-- CWD -->
        <div class="detail-section">
          <div class="detail-section-label">Working Directory</div>
          <code class="detail-path">{{ selectedSession.cwd || 'unknown' }}</code>
        </div>

        <!-- Args -->
        <div v-if="selectedSession.args.length" class="detail-section">
          <div class="detail-section-label">Launch Flags</div>
          <div class="detail-args">
            <code
              v-for="(arg, i) in selectedSession.args"
              :key="i"
              class="detail-arg"
              :class="{ 'arg-flag': arg.startsWith('--'), 'arg-value': !arg.startsWith('--') }"
            >{{ arg }}</code>
          </div>
        </div>

      </template>
    </Modal>
  </div>
</template>

<style>
/* Activity row clickable */
.activity-clickable {
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.activity-clickable:hover {
  border-color: var(--accent-border);
  background: var(--bg-card-hover);
}

.activity-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  padding-left: 12px;
}

.activity-project-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: 4px;
  padding: 2px 7px;
  white-space: nowrap;
}

.message-body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}

/* Session row clickable */
.session-row {
  cursor: pointer;
  user-select: none;
}
.session-row:hover .session-project { color: var(--accent); }

/* Modal detail styles */
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}
.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-card);
}
.detail-row:first-child { border-radius: 8px 8px 0 0; }
.detail-row:last-child  { border-radius: 0 0 8px 8px; }

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.detail-value {
  font-size: 12px;
  color: var(--text-primary);
}
.detail-code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: 4px;
  padding: 2px 7px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  text-align: right;
}

.detail-section { margin-bottom: 16px; }
.detail-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.detail-path {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  display: block;
  word-break: break-all;
  line-height: 1.6;
}

.detail-args {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.detail-arg {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-secondary);
}
.detail-arg.arg-flag { color: var(--accent); border-color: var(--accent-border); background: var(--accent-dim); }
.detail-arg.arg-value { color: var(--text-muted); }
</style>
