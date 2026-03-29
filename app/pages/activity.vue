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

// Rough markdown → plain text for display
function formatText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/#{1,4}\s/g, '')
    .trim()
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Activity</h1>
      <p class="page-subtitle">Recent messages across all Claude Code sessions · auto-refreshes every 15s</p>
    </div>

    <div v-if="!data?.items.length" class="empty">
      <div class="empty-icon">◎</div>
      No activity found
    </div>

    <div class="activity-list">
      <div
        v-for="(item, i) in data?.items"
        :key="i"
        class="activity-item activity-clickable"
        @click="open(item)"
      >
        <div :class="['activity-role', item.role]">{{ item.role }}</div>
        <div class="activity-content">
          <div class="activity-text">{{ formatText(item.text) }}</div>
        </div>
        <div class="activity-right">
          <span class="activity-project-badge">{{ item.project }}</span>
          <span class="activity-time">{{ relativeTime(item.timestamp) }}</span>
          <span style="color:var(--text-muted);font-size:12px">›</span>
        </div>
      </div>
    </div>

    <!-- Activity Detail Modal -->
    <Modal
      v-model="showModal"
      :title="selected?.role === 'user' ? 'User Message' : 'Assistant Response'"
    >
      <div v-if="selected">

        <!-- Meta row -->
        <div class="detail-grid" style="margin-bottom:16px">
          <div class="detail-row">
            <span class="detail-label">Role</span>
            <span
              class="activity-role"
              :class="selected.role"
              style="font-size:10px;padding:2px 8px;border-radius:4px"
            >{{ selected.role }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Project</span>
            <code class="detail-code">{{ selected.project }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-value">{{ fullDate(selected.timestamp) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Session ID</span>
            <code class="detail-code" style="font-size:10px">{{ selected.sessionId || '—' }}</code>
          </div>
        </div>

        <!-- Full message -->
        <div class="detail-section">
          <div class="detail-section-label">Full Message</div>
          <div class="message-body">{{ selected.fullText }}</div>
        </div>

      </div>
    </Modal>
  </div>
</template>

<style>
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
</style>
