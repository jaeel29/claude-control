<script setup lang="ts">
const route = useRoute()
const { data: stats } = await useFetch('/api/stats')

const nav = [
  { label: 'Overview', href: '/', icon: 'lucide:layout-dashboard' },
  { label: 'Projects', href: '/projects', icon: 'lucide:folder' },
  { label: 'Agents', href: '/agents', icon: 'lucide:bot' },
  { label: 'Activity', href: '/activity', icon: 'lucide:activity' },
  { label: 'Tasks', href: '/tasks', icon: 'lucide:check-square' },
  { label: 'Logs', href: '/logs', icon: 'lucide:scroll-text' },
  { label: 'Run', href: '/run', icon: 'lucide:play' },
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">
        <Icon name="lucide:terminal" size="14" color="#fff" />
      </div>
      <div>
        <div class="sidebar-logo-text">Claude Control</div>
        <div class="sidebar-logo-sub">Agent Dashboard</div>
      </div>
    </div>

    <span class="nav-label">Navigation</span>

    <NuxtLink
      v-for="item in nav"
      :key="item.href"
      :to="item.href"
      class="nav-item"
      :class="{ active: route.path === item.href }"
    >
      <Icon :name="item.icon" size="15" class="nav-icon" />
      {{ item.label }}
    </NuxtLink>

    <div class="sidebar-footer">
      <div class="sidebar-status">
        <span class="status-dot"></span>
        <span class="sidebar-status-text">
          {{ stats?.running ?? 0 }} session{{ stats?.running !== 1 ? 's' : '' }} running
        </span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  gap: 2px;
  overflow-y: auto;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 20px;
  border-bottom: 1px solid var(--sidebar-divider);
  margin-bottom: 8px;
}

.sidebar-logo-icon {
  width: 30px;
  height: 30px;
  background: var(--accent);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-logo-text {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.sidebar-logo-sub {
  font-size: 10px;
  color: var(--sidebar-text);
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(182, 199, 196, 0.45);
  padding: 14px 10px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--radius-xs);
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  cursor: pointer;
}
.nav-item:hover {
  background: var(--sidebar-hover);
  color: #ffffff;
}
.nav-item.active {
  background: var(--sidebar-active);
  color: var(--sidebar-text-active);
}

.nav-icon {
  opacity: 0.65;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.nav-item:hover .nav-icon,
.nav-item.active .nav-icon {
  opacity: 1;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--sidebar-divider);
}

.sidebar-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

.sidebar-status-text {
  font-size: 12px;
  color: var(--sidebar-text);
}
</style>
