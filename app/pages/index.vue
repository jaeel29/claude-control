<script setup lang="ts">
interface ConversationMessage {
	role: 'user' | 'assistant';
	text: string;
	fullText: string;
	timestamp: string;
}

interface ActivityItem {
	text: string;
	fullText: string;
	timestamp: string;
	project: string;
	sessionId: string;
	isRunning: boolean;
	messages: ConversationMessage[];
}

interface Session {
	pid: number;
	cwd: string;
	project: string;
	mode: string;
	elapsed: string;
	sessionId: string | null;
	resume: boolean;
	settingSources: string;
	args: string[];
}

const { data, refresh } = await useFetch('/api/home');

onMounted(() => {
	const t = setInterval(refresh, 10_000);
	onUnmounted(() => clearInterval(t));
});

const selectedSession = ref<Session | null>(null);
const showModal = ref(false);

function openSession(s: Session) {
	selectedSession.value = s;
	showModal.value = true;
}

import type { SessionGroup } from '~/components/ActivitySessionRow.vue';

const activitySessions = computed<SessionGroup[]>(() => {
	const map = new Map<string, SessionGroup>();
	for (const item of data.value?.activity ?? []) {
		const key = item.sessionId || item.timestamp;
		if (!map.has(key)) {
			map.set(key, {
				sessionId: item.sessionId,
				project: item.project,
				isRunning: item.isRunning,
				firstPrompt: item.text,
				promptCount: 0,
				messageCount: 0,
				lastTimestamp: item.timestamp,
				allMessages: [],
			});
		}
		const g = map.get(key)!;
		g.isRunning = g.isRunning || item.isRunning;
		g.promptCount += 1;
		g.messageCount += item.messages.length;
		g.allMessages.push(...item.messages);
	}
	return [...map.values()].slice(0, 5);
});

const selectedActivity = ref<SessionGroup | null>(null);
const showActivityModal = ref(false);

const selectedActivityAsItem = computed(() => {
	if (!selectedActivity.value) return null;
	return {
		text: selectedActivity.value.firstPrompt,
		fullText: selectedActivity.value.firstPrompt,
		timestamp: selectedActivity.value.lastTimestamp,
		project: selectedActivity.value.project,
		sessionId: selectedActivity.value.sessionId,
		messages: selectedActivity.value.allMessages,
	};
});

function openActivity(group: SessionGroup) {
	selectedActivity.value = group;
	showActivityModal.value = true;
}

function modeColor(mode: string) {
	if (mode === 'acceptEdits') return 'var(--accent)';
	if (mode === 'bypassPermissions') return 'var(--red)';
	return 'var(--text-secondary)';
}

</script>

<template>
	<div class="page">
		<div class="page-header">
			<h1 class="page-title">Overview</h1>
			<p class="page-subtitle">Live status of your Claude Code sessions and agents</p>
		</div>

		<!-- Stats -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-value">{{ data?.stats.running ?? 0 }}</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--green)"></span>
					Running Sessions
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{{ data?.stats.totalAgents ?? 0 }}</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--accent)"></span>
					Total Agents
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">
					<span>{{ data?.stats.activeProjects ?? 0 }}</span>
					<span style="color: var(--text-muted); font-weight: 400; font-size: 0.65em; margin: 0 4px">/</span>
					<span class="text-muted">{{ data?.stats.projects ?? 0 }}</span>
				</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--yellow)"></span>
					Projects
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{{ data?.stats.filesModifiedToday ?? 0 }}</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--blue)"></span>
					Files Modified Today
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{{ data?.stats.toolCallsToday ?? 0 }}</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--yellow)"></span>
					Tool Calls Today
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{{ data?.stats.commandsRunToday ?? 0 }}</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--text-muted)"></span>
					Commands Run Today
				</div>
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="section">
			<div class="section-header">
				<div class="section-title">Recent Activity</div>
			</div>

			<div v-if="!activitySessions.length" class="card">
				<div class="empty">
					<Icon name="lucide:message-square" size="28" style="opacity: 0.3; display: block; margin: 0 auto 10px" />
					No recent activity found
				</div>
			</div>

			<div class="activity-list">
				<ActivitySessionRow
					v-for="group in activitySessions"
					:key="group.sessionId"
					:group="group"
					@click="openActivity(group)"
				/>
			</div>
		</div>

		<!-- Running Sessions -->
		<div class="section">
			<div class="section-header">
				<div class="section-title">
					Running Sessions
					<!-- <span class="section-count">{{ data?.sessions.length ?? 0 }}</span> -->
				</div>
				<!-- <span style="font-size: 11px; color: var(--text-muted)">Click a row for details</span> -->
			</div>

			<div v-if="!data?.sessions.length" class="card">
				<div class="empty">
					<Icon name="lucide:monitor-off" size="28" style="opacity: 0.3; display: block; margin: 0 auto 10px" />
					No active Claude sessions detected
				</div>
			</div>

			<div v-else class="card">
				<div v-for="s in data?.sessions.slice(0, 5)" :key="s.pid" class="card-row session-row" @click="openSession(s)">
          <UiBadge color="green" dot :pulse="true">Active</UiBadge>

					<div class="session-info">
						<div class="session-project">{{ s.project || `PID ${s.pid}` }}</div>
						<div class="session-mode" :style="{ color: modeColor(s.mode) }">{{ s.mode }}</div>
					</div>
					<div style="display: flex; align-items: center; gap: 10px">
						<div class="session-time">{{ s.elapsed }}</div>
						<Icon name="lucide:chevron-right" size="14" style="color: var(--text-muted); flex-shrink: 0" />
					</div>
				</div>
			</div>
		</div>

		<ConversationModal v-model="showActivityModal" :item="selectedActivityAsItem" />

		<!-- Session Detail Modal -->
		<Modal v-model="showModal" :title="`Session · ${selectedSession?.project || 'Unknown'}`">
			<template v-if="selectedSession">
				<div class="detail-grid">
					<div class="detail-row">
						<span class="detail-label">Status</span>
						<span class="status online" style="font-size: 11px; padding: 2px 8px">
							<span class="status-dot"></span>Active
						</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">PID</span>
						<code class="detail-code">{{ selectedSession.pid }}</code>
					</div>
					<div class="detail-row">
						<span class="detail-label">Permission Mode</span>
						<code class="detail-code" :style="{ color: modeColor(selectedSession.mode) }">
							{{ selectedSession.mode }}
						</code>
					</div>
					<div class="detail-row">
						<span class="detail-label">Elapsed</span>
						<span class="detail-value">{{ selectedSession.elapsed }}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Session ID</span>
						<code class="detail-code" style="font-size: 10px">
							{{ selectedSession.sessionId ?? 'new session' }}
						</code>
					</div>
					<div class="detail-row">
						<span class="detail-label">Resuming</span>
						<span class="detail-value">{{ selectedSession.resume ? 'Yes' : 'No' }}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Settings</span>
						<code class="detail-code">{{ selectedSession.settingSources || '—' }}</code>
					</div>
				</div>

				<div class="detail-section">
					<div class="detail-section-label">Working Directory</div>
					<code class="detail-path">{{ selectedSession.cwd || 'unknown' }}</code>
				</div>

				<div v-if="selectedSession.args.length" class="detail-section">
					<div class="detail-section-label">Launch Flags</div>
					<div class="detail-args">
						<code
							v-for="(arg, i) in selectedSession.args"
							:key="i"
							class="detail-arg"
							:class="{ 'arg-flag': arg.startsWith('--'), 'arg-value': !arg.startsWith('--') }"
							>{{ arg }}</code
						>
					</div>
				</div>
			</template>
		</Modal>
	</div>
</template>

<style scoped>
/* ── Page header ── */
.page-header {
	margin-bottom: 28px;
}
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

/* ── Stat cards ── */
.stats-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px;
	margin-bottom: 28px;
}
.stat-card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: 16px;
	padding: 24px;
}
.stat-value {
	font-size: 24px;
	font-weight: 550;
	color: var(--text-primary);
	letter-spacing: -0.03em;
	line-height: 1;
}
.stat-unit {
	font-size: 0.55em;
	font-weight: 400;
	color: var(--text-muted);
	margin-left: 2px;
}
.text-muted {
	color: var(--text-muted);
}

.stat-label {
	font-size: 11px;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	margin-top: 8px;
	display: flex;
	align-items: center;
}
.stat-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	display: inline-block;
	margin-right: 6px;
	flex-shrink: 0;
}

/* ── Section ── */
.section {
	margin-bottom: 28px;
}
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}
.section-title {
	font-size: 14px;
	font-weight: 500;
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

/* ── Card ── */
.card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	/* box-shadow: var(--shadow-sm); */
}
.card-row {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px 18px;
	border-bottom: 1px solid var(--border-light);
	transition: background 0.12s;
}
.card-row:last-child {
	border-bottom: none;
}
.card-row:hover {
	background: #f5f5f5;
}

/* ── Empty ── */
.empty {
	text-align: center;
	padding: 52px 20px;
	color: var(--text-muted);
	font-size: 13px;
}

/* ── Session row ── */
.session-row {
	cursor: pointer;
	user-select: none;
}
.session-row:hover .session-project {
	color: var(--accent);
}

.session-info {
	flex: 1;
	min-width: 0;
}
.session-project {
	font-size: 13px;
	font-weight: 500;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: color 0.15s;
}
.session-mode {
	font-size: 11px;
	color: var(--text-secondary);
	margin-top: 1px;
}
.session-time {
	font-size: 11px;
	color: var(--text-muted);
	flex-shrink: 0;
}

/* ── Status badge ── */
.status {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 11px;
	font-weight: 500;
	padding: 3px 9px;
	border-radius: 20px;
	flex-shrink: 0;
}
.status.online {
	color: var(--green);
	background: var(--green-dim);
}
.status-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	animation: pulse 2s infinite;
}

/* ── Activity list ── */
.activity-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

/* ── Detail modal ── */
.detail-grid {
	display: flex;
	flex-direction: column;
	gap: 4px;
	/* background: var(--border); */  
	border-radius: var(--radius-sm);
	/* overflow: hidden; */
	margin-bottom: 16px;
}
.detail-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 0;
	background: var(--bg-card);
  border: 1px solid #ededed;
  border-radius: 10px;
  padding: 10px;
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
	/* font-family: 'SF Mono', 'Fira Code', monospace; */
	font-size: 12px;
	/* color: var(--accent); */
	/* background: var(--accent-dim); */
	/* border: 1px solid var(--accent-border); */
	/* border-radius: 4px; */
	/* padding: 2px 7px; */
	/* max-width: 280px; */
	/* overflow: hidden; */
	/* text-overflow: ellipsis; */
	/* white-space: nowrap; */
	/* display: block; */
	/* text-align: right; */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  text-align: right;
}
.detail-section {
	margin-bottom: 16px;
}
.detail-section-label {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-muted);
	margin-bottom: 8px;
}
.detail-path {
	/* font-family: 'SF Mono', 'Fira Code', monospace; */
	font-size: 11px;
	color: var(--text-secondary);
	background: var(--bg-surface);
	border: 1px solid var(--border);
	border-radius: var(--radius-xs);
	padding: 10px 12px;
	display: block;
	word-break: break-all;
	line-height: 1.6;
}
.detail-args {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}
.detail-arg {
	/* font-family: 'SF Mono', 'Fira Code', monospace; */
	font-size: 10px;
	padding: 3px 8px;
	border-radius: 4px;
	border: 1px solid var(--border);
	background: var(--bg-surface);
	color: var(--text-secondary);
}
.detail-arg.arg-flag {
	color: var(--accent);
	border-color: var(--accent-border);
	background: var(--accent-dim);
}
.detail-arg.arg-value {
	color: var(--text-muted);
}
</style>
