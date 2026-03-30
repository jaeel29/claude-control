<script setup lang="ts">
interface ConversationMessage {
  role: 'user' | 'assistant'
  text: string
  fullText: string
  timestamp: string
}

interface ActivityItem {
  text: string
  fullText: string
  timestamp: string
  project: string
  sessionId: string
  messages: ConversationMessage[]
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

function replyCount(item: ActivityItem) {
  const n = item.messages.filter(m => m.role === 'assistant').length
  return n === 0 ? '' : n === 1 ? '1 reply' : `${n} replies`
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

function cleanSystemTags(text: string) {
  return text
    .replace(/<ide_opened_file>[\s\S]*?opened the file ([^\s<]+)[\s\S]*?<\/ide_opened_file>/g, (_, path) => `@${path.split('/').pop()}`)
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')
    .trim()
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
      <div class="stat-card" style="grid-column: span 2">
        <div class="stat-value">
          <span style="color:blue">{{ data?.stats.activeProjects ?? 0 }}</span>
          <span style="color:var(--text-muted);font-weight:400;font-size:0.65em;margin:0 4px">/</span>
          <span>{{ data?.stats.projects ?? 0 }}</span>
        </div>
        <div class="stat-label">
          <span class="stat-dot" style="background: var(--yellow)"></span>
          Projects
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
          <Icon name="lucide:message-square" size="28" style="opacity:0.3;display:block;margin:0 auto 10px" />
          No recent activity found
        </div>
      </div>

      <div class="activity-list">
        <div
          v-for="(item, i) in data?.activity.slice(0, 5)"
          :key="i"
          class="activity-item activity-clickable"
          @click="openActivity(item)"
        >
          <div class="activity-role user">user</div>
          <div class="activity-content">
            <div class="activity-text">{{ cleanSystemTags(item.text) }}</div>
            <div v-if="replyCount(item)" class="activity-reply-count">{{ replyCount(item) }}</div>
          </div>
          <div class="activity-right">
            <span class="activity-project-badge">{{ item.project }}</span>
            <span class="activity-time">{{ relativeTime(item.timestamp) }}</span>
            <Icon name="lucide:chevron-right" size="14" style="color:var(--text-muted);flex-shrink:0" />
          </div>
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
          <Icon name="lucide:monitor-off" size="28" style="opacity:0.3;display:block;margin:0 auto 10px" />
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
            <div class="session-mode" :style="{ color: modeColor(s.mode) }">{{ s.mode }}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="session-time">{{ s.elapsed }}</div>
            <Icon name="lucide:chevron-right" size="14" style="color:var(--text-muted);flex-shrink:0" />
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Detail Modal -->
    <Modal v-model="showActivityModal" title="Conversation">
      <div v-if="selectedActivity">
        <div class="detail-grid" style="margin-bottom:16px">
          <div class="detail-row">
            <span class="detail-label">Project</span>
            <code class="detail-code">{{ selectedActivity.project }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-value">{{ fullDate(selectedActivity.timestamp) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Session</span>
            <code class="detail-code" style="font-size:10px">{{ selectedActivity.sessionId || '—' }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Messages</span>
            <span class="detail-value">{{ selectedActivity.messages.length }}</span>
          </div>
        </div>
        <div class="thread">
          <div v-for="(msg, mi) in selectedActivity.messages" :key="mi" :class="['thread-message', msg.role]">
            <div class="thread-role">{{ msg.role }}</div>
            <div class="thread-body">{{ cleanSystemTags(msg.fullText) }}</div>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Session Detail Modal -->
    <Modal v-model="showModal" :title="`Session · ${selectedSession?.project || 'Unknown'}`">
      <template v-if="selectedSession">
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

        <div class="detail-section">
          <div class="detail-section-label">Working Directory</div>
          <code class="detail-path">{{ selectedSession.cwd || 'unknown' }}</code>
        </div>

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

<style scoped>
/* ── Page header ── */
.page-header { margin-bottom: 28px; }
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.page-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 3px;
}

/* ── Stat cards ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 22px;
  box-shadow: var(--shadow-sm);
}
.stat-value {
  font-size: 24px;
  font-weight: 550;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1;
}
.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 8px;
  display: flex;
  align-items: center;
}
.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
  flex-shrink: 0;
}

/* ── Section ── */
.section { margin-bottom: 28px; }
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

/* ── Card ── */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.card-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.12s;
}
.card-row:last-child { border-bottom: none; }
.card-row:hover { background: var(--bg-surface); }

/* ── Empty ── */
.empty {
  text-align: center;
  padding: 52px 20px;
  color: var(--text-muted);
  font-size: 13px;
}

/* ── Session row ── */
.session-row {
  cursor: pointer;
  user-select: none;
}
.session-row:hover .session-project { color: var(--accent); }

.session-info { flex: 1; min-width: 0; }
.session-project {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}
.session-mode {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 1px;
}
.session-time {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ── Status badge ── */
.status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 20px;
  flex-shrink: 0;
}
.status.online { color: var(--green); background: var(--green-dim); }
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

/* ── Activity list ── */
.activity-list { display: flex; flex-direction: column; gap: 6px; }
.activity-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 18px;
  display: flex;
  gap: 12px;
  box-shadow: var(--shadow-sm);
}
.activity-clickable {
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.activity-clickable:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}
.activity-role {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
  padding-top: 1px;
  width: 60px;
}
.activity-role.user { color: var(--blue); }
.activity-content { flex: 1; min-width: 0; }
.activity-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.activity-reply-count {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
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
.activity-time {
  font-size: 10px;
  color: var(--text-muted);
}

/* ── Thread ── */
.thread { display: flex; flex-direction: column; gap: 16px; }
.thread-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 88%;
}
.thread-message.user { align-self: flex-end; align-items: flex-end; }
.thread-message.assistant { align-self: flex-start; align-items: flex-start; }
.thread-role {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0 4px;
}
.thread-body {
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 10px 14px;
  border-radius: 14px;
}
.thread-message.user .thread-body {
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  color: var(--text-primary);
  border-bottom-right-radius: 4px;
}
.thread-message.assistant .thread-body {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-bottom-left-radius: 4px;
}

/* ── Detail modal ── */
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--border);
  border-radius: var(--radius-sm);
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
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
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
  background: var(--bg-surface);
  color: var(--text-secondary);
}
.detail-arg.arg-flag { color: var(--accent); border-color: var(--accent-border); background: var(--accent-dim); }
.detail-arg.arg-value { color: var(--text-muted); }
</style>
