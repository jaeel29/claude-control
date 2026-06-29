<script setup lang="ts">
// Lazy + client-only so navigation is never blocked by this fetch.
const { data: logData, pending, error, refresh: refreshLog } = useApi().data<{ sessions: any[] }>(
	'sessionlog',
	'/sessionlog',
	{ server: false, lazy: true, default: () => ({ sessions: [] }) },
);
const hasData = computed(() => !!logData.value?.sessions);

const expandedSession = ref<string | null>(null);
function toggleSession(id: string) {
	expandedSession.value = expandedSession.value === id ? null : id;
}

onMounted(() => {
	const t = setInterval(() => refreshLog(), 15_000);
	onUnmounted(() => clearInterval(t));
});

function relativeTime(ts: string) {
	if (!ts) return '—';
	const diff = Date.now() - new Date(ts).getTime();
	const m = Math.floor(diff / 60_000);
	if (m < 1) return 'just now';
	if (m < 60) return `${m}m ago`;
	if (m < 1440) return `${Math.floor(m / 60)}h ago`;
	return `${Math.floor(m / 1440)}d ago`;
}

function topTools(toolCalls: Record<string, number>) {
	return Object.entries(toolCalls)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5);
}
</script>

<template>
	<div class="page">
		<div class="page-header">
			<div class="page-header-left">
				<h1 class="page-title">Session Logs</h1>
				<p class="page-subtitle">Tool call summaries across all Claude sessions</p>
			</div>
			<div class="page-header-right">
				<span class="total-badge">{{ logData?.sessions.length ?? 0 }} sessions</span>
				<span class="refresh-hint">auto-refreshes every 15s</span>
			</div>
		</div>

		<UiPageState
			:pending="pending"
			:has-data="hasData"
			:error="error"
			:empty="!logData?.sessions.length"
			empty-text="No session logs found"
			empty-icon="lucide:terminal"
			:on-retry="refreshLog"
		>
		<div class="log-list">
			<div
				v-for="session in logData.sessions"
				:key="session.sessionId"
				class="log-item"
				:class="{ expanded: expandedSession === session.sessionId }"
			>
				<div class="log-header" @click="toggleSession(session.sessionId)">
					<div class="log-header-left">
						<UiBadge v-if="session.isRunning" color="green" dot :pulse="true">running</UiBadge>
						<span class="log-project">{{ session.project }}</span>
						<span class="log-session-id">{{ session.sessionId.slice(0, 8) }}</span>
					</div>
					<div class="log-header-right">
						<div class="log-chips">
							<UiBadge v-if="session.filesEdited.length" color="teal">
								<template #icon-left><Icon name="lucide:file-edit" size="10" /></template>
								{{ session.filesEdited.length }} edited
							</UiBadge>
							<UiBadge v-if="session.filesWritten.length" color="green">
								<template #icon-left><Icon name="lucide:file-plus" size="10" /></template>
								{{ session.filesWritten.length }} written
							</UiBadge>
							<UiBadge v-if="session.commandsRun.length" color="orange">
								<template #icon-left><Icon name="lucide:terminal" size="10" /></template>
								{{ session.commandsRun.length }} cmds
							</UiBadge>
							<UiBadge v-if="session.agentsSpawned" color="purple">
								<template #icon-left><Icon name="lucide:bot" size="10" /></template>
								{{ session.agentsSpawned }} agents
							</UiBadge>
						</div>
						<span class="log-time">{{ relativeTime(session.lastActiveAt) }}</span>
						<Icon
							name="lucide:chevron-right"
							size="14"
							class="log-chevron"
							:style="{ transform: expandedSession === session.sessionId ? 'rotate(90deg)' : 'none' }"
						/>
					</div>
				</div>

				<div v-if="expandedSession === session.sessionId" class="log-detail">
					<div v-if="session.filesEdited.length" class="log-detail-group">
						<div class="log-detail-label">Files Edited</div>
						<div class="log-file-list">
							<code v-for="f in session.filesEdited" :key="f" class="log-file">{{
								f.split('/').slice(-2).join('/')
							}}</code>
						</div>
					</div>
					<div v-if="session.filesWritten.length" class="log-detail-group">
						<div class="log-detail-label">Files Written</div>
						<div class="log-file-list">
							<code v-for="f in session.filesWritten" :key="f" class="log-file">{{
								f.split('/').slice(-2).join('/')
							}}</code>
						</div>
					</div>
					<div v-if="session.commandsRun.length" class="log-detail-group">
						<div class="log-detail-label">Commands</div>
						<div class="log-cmd-list">
							<code v-for="(cmd, i) in session.commandsRun.slice(0, 10)" :key="i" class="log-cmd">{{ cmd }}</code>
						</div>
					</div>
					<div class="log-detail-group">
						<div class="log-detail-label">Tool Usage</div>
						<div class="log-tool-chips">
							<span v-for="[tool, count] in topTools(session.toolCalls)" :key="tool" class="log-tool-chip">
								{{ tool }} <strong>{{ count }}</strong>
							</span>
						</div>
					</div>
					<div v-if="session.cwd" class="log-detail-group">
						<div class="log-detail-label">Working Directory</div>
						<code class="log-cwd">{{ session.cwd }}</code>
					</div>
				</div>
			</div>
		</div>
		</UiPageState>
	</div>
</template>

<style scoped lang="scss">
/* ── Page header ── */
.page-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 24px;
	gap: 16px;

	@include respond-to('sm') {
		flex-direction: column;
		gap: 10px;
	}
}
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
.page-header-right {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
	padding-top: 4px;
	flex-wrap: wrap;

	@include respond-to('sm') {
		padding-top: 0;
	}
}
.total-badge {
	font-size: 11px;
	font-weight: 500;
	color: var(--text-muted);
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: 20px;
	padding: 3px 10px;
}
.refresh-hint {
	font-size: 11px;
	color: var(--text-muted);
}

/* ── Card / Empty ── */
.card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	box-shadow: var(--shadow-sm);
}
.empty {
	text-align: center;
	padding: 72px 20px;
	color: var(--text-muted);
	font-size: 13px;
}

/* ── Log list ── */
.log-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.log-item {
	background: var(--bg-card);
	border: 1px solid transparent;
	border-radius: var(--radius);
	overflow: hidden;
	/* box-shadow: var(--shadow-sm); */
	transition: border-color 0.15s, box-shadow 0.15s;
}
.log-item.expanded {
	border-color: var(--accent-border);
}
.log-item:not(.expanded):hover {
	border-color: var(--color-text-subtle);
	background: var(--bg-card-hover);
}
.log-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	cursor: pointer;
	gap: 12px;
	transition: background 0.12s;

	@include respond-to('xs') {
		flex-wrap: wrap;
		gap: 8px;
	}
}
.log-header:hover {
	/* background: var(--bg-surface); */
}
.log-header-left {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	flex-wrap: wrap;
}
.log-project {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-primary);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}
.log-session-id {
	font-size: 10px;
	font-family: 'SF Mono', 'Fira Code', monospace;
	color: var(--text-muted);
	background: var(--bg-surface);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 1px 6px;
}
.log-header-right {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;

	@include respond-to('xs') {
		flex-wrap: wrap;
		flex-shrink: 1;
	}
}
.log-chips {
	display: flex;
	gap: 5px;
	flex-wrap: wrap;
}
.log-time {
	font-size: 11px;
	color: var(--text-muted);
}
.log-chevron {
	color: var(--text-muted);
	transition: transform 0.2s;
	flex-shrink: 0;
}

/* ── Log detail ── */
.log-detail {
	padding: 16px 18px;
	border-top: 1px solid var(--border-light);
	display: flex;
	flex-direction: column;
	gap: 14px;
}
.log-detail-label {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.07em;
	color: var(--text-muted);
	margin-bottom: 7px;
}
.log-file-list {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}
.log-file {
	font-family: 'SF Mono', 'Fira Code', monospace;
	font-size: 11px;
	color: var(--accent);
	background: var(--accent-dim);
	border: 1px solid var(--accent-border);
	border-radius: 4px;
	padding: 2px 7px;
}
.log-cmd-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.log-cmd {
	font-family: 'SF Mono', 'Fira Code', monospace;
	font-size: 11px;
	color: var(--text-secondary);
	background: var(--bg-surface);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 5px 9px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	display: block;
}
.log-tool-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}
.log-tool-chip {
	font-size: 11px;
	color: var(--text-secondary);
	background: var(--bg-surface);
	border: 1px solid var(--border);
	border-radius: 20px;
	padding: 2px 9px;
}
.log-tool-chip strong {
	color: var(--text-primary);
	margin-left: 3px;
}
.log-cwd {
	font-family: 'SF Mono', 'Fira Code', monospace;
	font-size: 11px;
	color: var(--text-muted);
	display: block;
	word-break: break-all;
}
</style>
