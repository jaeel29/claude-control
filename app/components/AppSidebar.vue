<script setup lang="ts">
const route = useRoute()
// Lazy + client-only so the sidebar never blocks page navigation.
const { data: stats } = useLazyFetch('/api/stats', { server: false })
const { data: projectsData } = useLazyFetch('/api/projects', { server: false })

const { open } = useSidebar()
const { selectedTheme, setTheme } = useTheme()
const themeOptions = [
  { value: 'light', icon: 'icons:theme-light', label: 'Light' },
  { value: 'dark', icon: 'icons:theme-dark', label: 'Dark' },
  { value: 'system', icon: 'icons:theme-system', label: 'System' },
] as const

const search = ref('')

const projects = computed(() =>
  (projectsData.value?.projects ?? []).filter((p) => p.path).slice(0, 8)
)

const nav = [
  { label: 'Overview',  href: '/overview', icon: 'lucide:house' },
  { label: 'Activity',  href: '/activity',  icon: 'lucide:activity' },
  { label: 'Agents',    href: '/agents',    icon: 'lucide:bot' },
  // { label: 'Tasks',     href: '/tasks',     icon: 'lucide:check-square' },
  { label: 'Logs',      href: '/logs',      icon: 'lucide:scroll-text' },
  // { label: 'Run',       href: '/run',       icon: 'lucide:send' },
  { label: 'Usage', href: '/usage',     icon: 'lucide:chart-pie' },
  // { label: 'Test',      href: '/test',      icon: 'lucide:flask-conical' },
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
  <aside class="sidebar" :class="{ 'sidebar--open': open }">

    <!-- ── Workspace (click → landing page) ── -->
    <NuxtLink to="/" class="workspace" title="Back to home">
      <div class="workspace-avatar">
        <Icon name="icons:logo" :size="24" mode="svg" />
      </div>
      <div class="workspace-info">
        <div class="workspace-name">Claude Control</div>
        <div class="workspace-sub">Agent Dashboard</div>
      </div>
    </NuxtLink>

    <!-- ── Search ── -->
    <!-- <div class="search-wrap">
      <Icon name="lucide:search" size="13" class="search-icon" />
      <input v-model="search" class="search-input" placeholder="Search…" />
    </div> -->

    <!-- ── Overview nav ── -->
    <!-- <div class="section-label">Overview</div> -->

    <div class="nav-items">
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
    </div>

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

    <!-- ── Footer: theme toggle ── -->
    <div class="sidebar-footer">
      <!-- ClientOnly: selectedTheme differs between SSR ('system' default) and the
           client (saved value), so SSR marks the wrong tab active and flashes two
           highlights. Render client-side only (same as Diali's footer). -->
      <ClientOnly>
        <div class="theme-toggle" role="group" aria-label="Theme">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            class="theme-toggle__btn"
            :class="{ active: selectedTheme === opt.value }"
            type="button"
            :title="opt.label"
            :aria-label="opt.label"
            :aria-pressed="selectedTheme === opt.value"
            @click="setTheme(opt.value)"
          >
            <Icon :name="opt.icon" size="15" mode="svg" />
          </button>
        </div>
      </ClientOnly>
    </div>

  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 1px;
  overflow-y: auto;
  border-radius: 16px;
  border: 1px solid var(--color-border);

  /* Off-canvas drawer ≤ md: slide in from the left over a backdrop (the
     backdrop + hamburger live in the layout). Toggled by .sidebar--open. */
  @include respond-to('md') {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.18);

    &--open {
      transform: translateX(0);
    }
  }
}

/* ── Workspace ── */
.workspace {
  display: flex;
  align-items: center;
  gap: 10px;
  /* padding: 4px 8px; */
  margin-bottom: 24px;
  text-decoration: none;
  color: inherit;
  border-radius: 8px;
  transition: opacity 0.12s;
  /* border-bottom: 1px solid var(--sidebar-divider); */

  &:hover {
    opacity: 0.75;
  }
}

.workspace-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--sidebar-border);
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
  color: #999;
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
.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  height: 32px;
  border-radius: 8px;
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
  background: color-mix(in srgb, var(--color-text) 5%, transparent);
}

.nav-item.active {
  background: color-mix(in srgb, var(--color-text) 5%, transparent);
  color: var(--text-primary);
  box-shadow: var(--glass-card-shadow);
  
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
  padding-top: 12px;
  /* border-top: 1px solid var(--sidebar-divider); */
}

/* ── Theme toggle (segmented light / dark / system) ── */
.theme-toggle {
  display: flex;
  gap: 6px;
  /* padding: 3px; */
  /* border-radius: var(--radius-sm); */
  /* background: var(--bg-surface); */
  /* border: 1px solid var(--border); */
}


.theme-toggle__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--sidebar-border);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.theme-toggle__btn:hover {
  color: var(--text-primary);
}
.theme-toggle__btn.active {
  background: color-mix(in srgb, var(--color-text) 5%, transparent);
  color: var(--text-primary);
  box-shadow: var(--glass-card-shadow);
  /* box-shadow: var(--shadow-sm); */
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
