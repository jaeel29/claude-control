<script setup lang="ts">
interface ProjectInfo {
  name: string
  path: string | null
  slug: string
  lastActive: string | null
  sessionCount: number
  hasLocalAgents: boolean
}

const { data, refresh } = useLazyFetch<{ projects: ProjectInfo[] }>('/api/projects', { server: false })

onMounted(() => {
  const t = setInterval(refresh, 10_000)
  onUnmounted(() => clearInterval(t))
})

const filter = ref<'all' | 'active'>('all')

const filtered = computed(() => {
  if (!data.value?.projects) return []
  if (filter.value === 'active') return data.value.projects.filter(p => p.sessionCount > 0)
  return data.value.projects
})

const activeCount = computed(() => data.value?.projects.filter(p => p.sessionCount > 0).length ?? 0)
const totalCount = computed(() => data.value?.projects.length ?? 0)

function relativeTime(ts: string | null) {
  if (!ts) return 'never'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  if (m < 43200) return `${Math.floor(m / 1440)}d ago`
  return `${Math.floor(m / 43200)}mo ago`
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Projects</h1>
      <p class="page-subtitle">All projects Claude Code has worked in</p>
    </div>

    <div class="filter-bar">
      <button :class="['filter-badge', filter === 'all' && 'active']" @click="filter = 'all'">
        All <span class="filter-count">{{ totalCount }}</span>
      </button>
      <button :class="['filter-badge', filter === 'active' && 'active']" @click="filter = 'active'">
        <span class="pulse-dot"></span>
        Active <span class="filter-count">{{ activeCount }}</span>
      </button>
    </div>

    <div v-if="!filtered.length" class="empty">
      <Icon name="lucide:folder-open" size="28" style="opacity:0.3;display:block;margin:0 auto 10px" />
      No {{ filter === 'active' ? 'active' : '' }} projects found
    </div>

    <div v-else class="projects-grid">
      <div
        v-for="proj in filtered"
        :key="proj.slug"
        class="project-card"
        :class="{ 'project-active': proj.sessionCount > 0 }"
      >
        <div class="project-card-header">
          <div class="project-icon">◈</div>
          <div class="project-title-group">
            <div class="project-name">{{ proj.name }}</div>
            <UiBadge v-if="proj.sessionCount > 0" color="green" dot :pulse="true">
              {{ proj.sessionCount }} running
            </UiBadge>
          </div>
          <div class="project-last-active">{{ relativeTime(proj.lastActive) }}</div>
        </div>

        <div v-if="proj.path" class="project-path">{{ proj.path }}</div>
        <div v-else class="project-path project-path-missing">path not found on disk</div>

        <div class="project-footer">
          <UiBadge v-if="proj.hasLocalAgents" color="outline">local agents</UiBadge>
          <UiBadge v-if="!proj.path" color="gray">archived</UiBadge>
        </div>
      </div>
    </div>
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

/* ── Filter bar ── */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.filter-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.filter-badge:hover {
  border-color: var(--accent-border);
  color: var(--text-primary);
}
.filter-badge.active {
  background: var(--accent-dim);
  border-color: var(--accent-border);
  color: var(--accent);
}
.filter-count {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 10px;
  color: var(--text-muted);
}
.filter-badge.active .filter-count {
  background: transparent;
  border-color: var(--accent-border);
  color: var(--accent);
}

/* ── Pulse dot ── */
.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  display: inline-block;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

/* ── Projects grid ── */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.project-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.project-card:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}
.project-card.project-active {
  border-color: rgba(16, 185, 129, 0.25);
}
.project-card.project-active:hover {
  border-color: rgba(16, 185, 129, 0.4);
}

/* ── Project card header ── */
.project-card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.project-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.project-card.project-active .project-icon {
  background: var(--green-dim);
  border-color: rgba(16, 185, 129, 0.25);
  color: var(--green);
}
.project-title-group {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.project-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.project-last-active {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Project path ── */
.project-path {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'SF Mono', 'Fira Code', monospace;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xs);
  padding: 6px 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.project-path-missing {
  font-style: italic;
  opacity: 0.6;
}

/* ── Project footer ── */
.project-footer {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 20px;
}
</style>
