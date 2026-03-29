<script setup lang="ts">
const route = useRoute()
const { data: stats } = await useFetch('/api/stats')

const nav = [
  { label: 'Overview', href: '/', icon: '⬡' },
  { label: 'Agents', href: '/agents', icon: '◈' },
  { label: 'Activity', href: '/activity', icon: '◎' },
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">⌘</div>
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
      <span class="icon">{{ item.icon }}</span>
      {{ item.label }}
      <span v-if="item.href === '/' && stats?.running > 0" class="nav-badge">
        {{ stats.running }}
      </span>
    </NuxtLink>

    <span class="nav-label" style="margin-top: auto; padding-top: 24px;">Status</span>
    <div class="nav-item" style="cursor: default;">
      <span class="status-dot" style="width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;flex-shrink:0;"></span>
      <span style="font-size:12px;color:var(--text-secondary);">{{ stats?.running ?? 0 }} session{{ stats?.running !== 1 ? 's' : '' }} running</span>
    </div>
  </aside>
</template>
