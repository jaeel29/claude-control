<script setup lang="ts">
const { data } = useLazyFetch('/api/agents', { server: false })

function toolList(tools: string) {
  return tools?.split(',').map(t => t.trim()).filter(Boolean) ?? []
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Agents</h1>
      <p class="page-subtitle">All subagents across global and project scopes</p>
    </div>

    <!-- Global agents -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          Global
          <span class="section-count">{{ data?.global.length ?? 0 }}</span>
        </div>
        <span class="section-hint">~/.claude/agents/</span>
      </div>

      <div v-if="!data?.global.length" class="card">
        <div class="empty">
          <Icon name="lucide:bot" size="28" style="opacity:0.3;display:block;margin:0 auto 10px" />
          No global agents found
        </div>
      </div>

      <div v-else class="agent-grid">
        <div v-for="agent in data?.global" :key="agent.name" class="agent-card">
          <div class="agent-card-header">
            <div class="agent-icon">
              <Icon name="lucide:bot" size="15" style="color:var(--accent)" />
            </div>
            <div>
              <div class="agent-name">{{ agent.name }}</div>
              <div class="agent-scope">Global · {{ agent.model || 'default model' }}</div>
            </div>
          </div>
          <div class="agent-desc">{{ agent.description }}</div>
          <div class="agent-meta">
            <UiBadge color="teal">{{ agent.model || 'default' }}</UiBadge>
            <UiBadge v-for="tool in toolList(agent.tools)" :key="tool" color="gray">{{ tool }}</UiBadge>
          </div>
        </div>
      </div>
    </div>

    <!-- Project agents -->
    <div v-for="proj in data?.projects" :key="proj.project" class="section">
      <div class="section-header">
        <div class="section-title">
          {{ proj.project }}
          <span class="section-count">{{ proj.agents.length }}</span>
        </div>
        <span class="section-hint">.claude/agents/</span>
      </div>

      <div class="agent-grid">
        <div v-for="agent in proj.agents" :key="agent.name" class="agent-card">
          <div class="agent-card-header">
            <div class="agent-icon project-icon">
              <Icon name="lucide:cpu" size="15" style="color:var(--blue)" />
            </div>
            <div>
              <div class="agent-name">{{ agent.name }}</div>
              <div class="agent-scope">{{ proj.project }} · {{ agent.model || 'default model' }}</div>
            </div>
          </div>
          <div class="agent-desc">{{ agent.description }}</div>
          <div class="agent-meta">
            <UiBadge color="teal">{{ agent.model || 'default' }}</UiBadge>
            <UiBadge v-for="tool in toolList(agent.tools)" :key="tool" color="gray">{{ tool }}</UiBadge>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!data?.global.length && !data?.projects.length" class="empty">
      <Icon name="lucide:bot" size="28" style="opacity:0.3;display:block;margin:0 auto 10px" />
      No agents found. Create .md files in ~/.claude/agents/ or .claude/agents/
    </div>
  </div>
</template>

<style scoped lang="scss">
/* ── Page header ── */
.page-header { margin-bottom: 28px; }
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;

  @include respond-to('sm') {
    font-size: 19px;
  }
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
.section-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── Card ── */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

/* ── Agent grid ── */
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;

  @include respond-to('xs') {
    grid-template-columns: 1fr;
  }
}
.agent-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  /* box-shadow: var(--shadow-sm); */
  transition: border-color 0.15s, box-shadow 0.15s;
}
.agent-card:hover {
  border-color: var(--accent-border);
  /* box-shadow: var(--shadow); */
}
.agent-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.agent-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  flex-shrink: 0;
}
.agent-icon.project-icon {
  background: var(--blue-dim);
  border-color: rgba(59, 130, 246, 0.2);
}
.agent-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.agent-scope {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 1px;
}
.agent-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.55;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.agent-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

</style>
