<script setup lang="ts">
const route = useRoute()
const { data: stats } = await useFetch('/api/stats')
const { data: projectsData } = await useFetch('/api/projects')

const search = ref('')

const projects = computed(() =>
  (projectsData.value?.projects ?? []).filter((p) => p.path).slice(0, 8)
)

const nav = [
  { label: 'Overview',  href: '/',         icon: 'lucide:layout-dashboard' },
  { label: 'Activity',  href: '/activity',  icon: 'lucide:activity' },
  { label: 'Agents',    href: '/agents',    icon: 'lucide:bot' },
  // { label: 'Tasks',     href: '/tasks',     icon: 'lucide:check-square' },
  { label: 'Logs',      href: '/logs',      icon: 'lucide:scroll-text' },
  { label: 'Run',       href: '/run',       icon: 'lucide:send' },
]

const PROJECT_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#db2777', '#0284c7',
]
function projectColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]!
}
function projectInitial(name: string) {
  return name.slice(0, 1).toUpperCase()
}
</script>

<template>
  <aside class="sidebar">

    <!-- ── Workspace ── -->
    <div class="workspace">
      <div class="workspace-avatar">
        <Icon name="lucide:terminal" size="13" color="#fff" />
      </div>
      <div class="workspace-info">
        <div class="workspace-name">Claude Control</div>
        <div class="workspace-sub">Agent Dashboard</div>
      </div>
    </div>

    <!-- ── Search ── -->
    <!-- <div class="search-wrap">
      <Icon name="lucide:search" size="13" class="search-icon" />
      <input v-model="search" class="search-input" placeholder="Search…" />
    </div> -->

    <!-- ── Overview nav ── -->
    <!-- <div class="section-label">Overview</div> -->

    <NuxtLink
      v-for="item in nav"
      v-show="!search || item.label.toLowerCase().includes(search.toLowerCase())"
      :key="item.href"
      :to="item.href"
      class="nav-item"
      :class="{ active: route.path === item.href }"
    >
      <span class="nav-icon-wrap">
        <Icon :name="item.icon" size="16" />
      </span>
      {{ item.label }}
    </NuxtLink>

    <!-- ── Projects ── -->
    <template v-if="projects.length">
      <!-- <div class="section-row">
        <span class="section-label">Projects</span>
        <NuxtLink to="/projects" class="section-action" title="All projects">
          <Icon name="lucide:arrow-right" size="12" />
        </NuxtLink>
      </div> -->

      <!-- <NuxtLink
        v-for="proj in projects"
        v-show="!search || proj.name.toLowerCase().includes(search.toLowerCase())"
        :key="proj.path ?? proj.name"
        to="/projects"
        class="nav-item proj-item"
      >
        <span class="proj-avatar" :style="{ background: projectColor(proj.name) }">
          {{ projectInitial(proj.name) }}
        </span>
        <span class="proj-name">{{ proj.name }}</span>
        <span v-if="proj.sessionCount > 0" class="proj-badge">{{ proj.sessionCount }}</span>
      </NuxtLink> -->
    </template>

    <!-- ── Footer ── -->
    <!-- <div class="sidebar-footer">
      <div class="status-row">
        <span class="status-dot" :class="{ active: (stats?.running ?? 0) > 0 }"></span>
        <span class="status-text">
          {{ stats?.running ?? 0 }} session{{ stats?.running !== 1 ? 's' : '' }} running
        </span>
      </div>
    </div> -->

  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 1px;
  overflow-y: auto;
}

/* ── Workspace ── */
.workspace {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 14px;
  margin-bottom: 4px;
  /* border-bottom: 1px solid var(--sidebar-divider); */
}

.workspace-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.workspace-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.workspace-sub {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── Search ── */
.search-wrap {
  position: relative;
  margin: 12px 0 4px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 34px;
  padding: 0 10px 0 32px;
  background: var(--bg-surface);
  border: 1px solid var(--sidebar-divider);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-input::placeholder { color: var(--text-muted); }
.search-input:focus {
  border-color: #111827;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}

/* ── Section labels ── */
.section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 12px 8px 4px;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px 4px;
}
.section-row .section-label { padding: 0; }

.section-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: var(--text-muted);
  transition: background 0.12s, color 0.12s;
}
.section-action:hover {
  background: var(--sidebar-hover);
  color: var(--text-primary);
}

/* ── Nav items ── */
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition: background 0.12s, color 0.12s;
  cursor: pointer;
  user-select: none;
}
.nav-item:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text-active);
}
.nav-item.active {
  background: #111827;
  color: #ffffff;
}

.nav-icon-wrap {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.65;
  transition: opacity 0.12s;
}
.nav-item:hover .nav-icon-wrap { opacity: 1; }
.nav-item.active .nav-icon-wrap { opacity: 1; }

/* ── Project items ── */
.proj-item { gap: 8px; }

.proj-avatar {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.proj-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-badge {
  font-size: 10px;
  font-weight: 600;
  background: var(--sidebar-hover);
  color: var(--text-muted);
  padding: 1px 6px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}

/* ── Footer ── */
.sidebar-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--sidebar-divider);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
  transition: background 0.3s;
}
.status-dot.active {
  background: #10b981;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
