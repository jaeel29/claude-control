<script setup lang="ts">
const { data } = await useFetch('/api/agents')

function toolList(tools: string) {
  return tools?.split(',').map(t => t.trim()).filter(Boolean) ?? []
}

const icons: Record<string, string> = {
  'git-explainer': '◈',
  'recipe-finder': '◉',
  'code-reviewer': '◎',
  'db-analyst': '⬡',
}
function agentIcon(name: string) {
  return icons[name] ?? '◈'
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
        <span style="font-size:11px;color:var(--text-muted);">~/.claude/agents/</span>
      </div>

      <div v-if="!data?.global.length" class="card">
        <div class="empty">
          <div class="empty-icon">◈</div>
          No global agents found
        </div>
      </div>

      <div v-else class="agent-grid">
        <div v-for="agent in data?.global" :key="agent.name" class="agent-card">
          <div class="agent-card-header">
            <div class="agent-icon">{{ agentIcon(agent.name) }}</div>
            <div>
              <div class="agent-name">{{ agent.name }}</div>
              <div class="agent-scope">Global · {{ agent.model || 'default model' }}</div>
            </div>
          </div>
          <div class="agent-desc">{{ agent.description }}</div>
          <div class="agent-meta">
            <span class="tag model">{{ agent.model || 'default' }}</span>
            <span v-for="tool in toolList(agent.tools)" :key="tool" class="tag tool">{{ tool }}</span>
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
        <span style="font-size:11px;color:var(--text-muted);">.claude/agents/</span>
      </div>

      <div class="agent-grid">
        <div v-for="agent in proj.agents" :key="agent.name" class="agent-card">
          <div class="agent-card-header">
            <div class="agent-icon" style="background: var(--blue-dim); color: var(--blue)">
              {{ agentIcon(agent.name) }}
            </div>
            <div>
              <div class="agent-name">{{ agent.name }}</div>
              <div class="agent-scope">{{ proj.project }} · {{ agent.model || 'default model' }}</div>
            </div>
          </div>
          <div class="agent-desc">{{ agent.description }}</div>
          <div class="agent-meta">
            <span class="tag model">{{ agent.model || 'default' }}</span>
            <span v-for="tool in toolList(agent.tools)" :key="tool" class="tag tool">{{ tool }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!data?.global.length && !data?.projects.length" class="empty">
      <div class="empty-icon">◈</div>
      No agents found. Create .md files in ~/.claude/agents/ or .claude/agents/
    </div>
  </div>
</template>
