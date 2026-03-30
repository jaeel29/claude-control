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

const { data, refresh } = await useFetch<{ items: ActivityItem[] }>('/api/activity')

onMounted(() => {
  const t = setInterval(refresh, 15_000)
  onUnmounted(() => clearInterval(t))
})

const selected = ref<ActivityItem | null>(null)
const showModal = ref(false)

function open(item: ActivityItem) {
  selected.value = item
  showModal.value = true
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

function fullDate(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function cleanSystemTags(text: string) {
  return text
    .replace(/<ide_opened_file>[\s\S]*?opened the file ([^\s<]+)[\s\S]*?<\/ide_opened_file>/g, (_, path) => `@${path.split('/').pop()}`)
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')
    .trim()
}

function formatText(text: string) {
  return cleanSystemTags(text)
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/#{1,4}\s/g, '')
    .trim()
}

function replyCount(item: ActivityItem) {
  const n = item.messages.filter(m => m.role === 'assistant').length
  return n === 0 ? '' : n === 1 ? '1 reply' : `${n} replies`
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Activity</h1>
      <p class="page-subtitle">Recent conversations across all Claude Code sessions · auto-refreshes every 15s</p>
    </div>

    <div v-if="!data?.items.length" class="empty">
      <Icon name="lucide:activity" size="28" style="opacity:0.3;display:block;margin:0 auto 10px" />
      No activity found
    </div>

    <div class="activity-list">
      <div
        v-for="(item, i) in data?.items"
        :key="i"
        class="activity-item activity-clickable"
        @click="open(item)"
      >
        <div class="activity-role user">user</div>
        <div class="activity-content">
          <div class="activity-text">{{ formatText(item.text) }}</div>
          <div v-if="replyCount(item)" class="activity-reply-count">{{ replyCount(item) }}</div>
        </div>
        <div class="activity-right">
          <span class="activity-project-badge">{{ item.project }}</span>
          <span class="activity-time">{{ relativeTime(item.timestamp) }}</span>
          <Icon name="lucide:chevron-right" size="14" style="color:var(--text-muted);flex-shrink:0" />
        </div>
      </div>
    </div>

    <!-- Conversation Thread Modal -->
    <Modal v-model="showModal" title="Conversation">
      <div v-if="selected">
        <div class="detail-grid" style="margin-bottom:16px">
          <div class="detail-row">
            <span class="detail-label">Project</span>
            <code class="detail-code">{{ selected.project }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-value">{{ fullDate(selected.timestamp) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Session</span>
            <code class="detail-code" style="font-size:10px">{{ selected.sessionId || '—' }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Messages</span>
            <span class="detail-value">{{ selected.messages.length }}</span>
          </div>
        </div>

        <div class="thread">
          <div
            v-for="(msg, mi) in selected.messages"
            :key="mi"
            :class="['thread-message', msg.role]"
          >
            <div class="thread-role">{{ msg.role }}</div>
            <div class="thread-body">{{ cleanSystemTags(msg.fullText) }}</div>
          </div>
        </div>
      </div>
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

/* ── Empty ── */
.empty {
  text-align: center;
  padding: 52px 20px;
  color: var(--text-muted);
  font-size: 13px;
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
</style>
