<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
interface ConversationMessage {
	role: 'user' | 'assistant' | 'tool';
	text: string;
	fullText: string;
	timestamp: string;
	toolName?: string;
}

interface ActivityItem {
	text: string;
	fullText: string;
	timestamp: string;
	project: string;
	sessionId: string;
	cwd: string;
	isRunning: boolean;
	aiTitle: string | null;
	messages: ConversationMessage[];
}

interface SessionGroup {
	sessionId: string;
	project: string;
	cwd: string;
	isRunning: boolean;
	firstPrompt: string;
	aiTitle: string | null;
	promptCount: number;
	messageCount: number;
	lastTimestamp: string;
	allMessages: ConversationMessage[];
}

const { data, refresh } = await useFetch<{ items: ActivityItem[] }>('/api/activity');

onMounted(() => {
	const t = setInterval(refresh, 2_000);
	onUnmounted(() => clearInterval(t));
});

// Group individual turns into one row per session
const sessions = computed<SessionGroup[]>(() => {
	const map = new Map<string, SessionGroup>();
	// items are sorted newest-first from the API
	for (const item of data.value?.items ?? []) {
		const key = item.sessionId || item.timestamp;
		if (!map.has(key)) {
			map.set(key, {
				sessionId: item.sessionId,
				project: item.project,
				cwd: item.cwd,
				isRunning: item.isRunning,
				firstPrompt: item.text,
				aiTitle: item.aiTitle ?? null,
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
	// running sessions first, then most recent
	return [...map.values()].sort((a, b) => {
		if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1;
		return new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime();
	});
});

const selectedId = ref<string | null>(null);
const showModal = ref(false);

// Always derived from live sessions — updates automatically on each refresh
const selectedAsItem = computed(() => {
	if (!selectedId.value) return null;
	const g = sessions.value.find(s => s.sessionId === selectedId.value);
	if (!g) return null;
	return {
		text: g.firstPrompt,
		fullText: g.firstPrompt,
		timestamp: g.lastTimestamp,
		project: g.project,
		cwd: g.cwd,
		sessionId: g.sessionId,
		aiTitle: g.aiTitle,
		messages: [...g.allMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
	};
});

function open(group: SessionGroup) {
	selectedId.value = group.sessionId;
	showModal.value = true;
}

</script>

<template>
	<div class="page">
		<div class="page-header">
			<div>
				<h1 class="page-title">Activity</h1>
				<p class="page-subtitle">Recent conversations across all Claude Code sessions · auto-refreshes every 2s</p>
			</div>
			<div class="page-header-right">
				<span class="total-badge">{{ sessions.length }} sessions</span>
				<UiBadge v-if="sessions.some(s => s.isRunning)" color="green" dot :pulse="true">
					{{ sessions.filter(s => s.isRunning).length }} running
				</UiBadge>
			</div>
		</div>

		<div v-if="!sessions.length" class="empty">
			<Icon name="lucide:activity" size="28" style="opacity: 0.3; display: block; margin: 0 auto 10px" />
			No activity found
		</div>

		<div class="activity-list">
			<ActivitySessionRow v-for="group in sessions" :key="group.sessionId" :group="group" @click="open(group)" />
		</div>

		<ConversationModal v-model="showModal" :item="selectedAsItem" />
	</div>
</template>

<style scoped>
/* ── Page header ── */
.page-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 28px;
	gap: 16px;
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
.page-header-right {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
	padding-top: 4px;
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

/* ── Empty ── */
.empty {
	text-align: center;
	padding: 52px 20px;
	color: var(--text-muted);
	font-size: 13px;
}

/* ── Activity list ── */
.activity-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.activity-item {
	background: var(--bg-card);
	border: 1px solid transparent;
	border-radius: var(--radius);
	padding: 14px 18px;
	display: flex;
	align-items: center;
	gap: 14px;
	box-shadow: var(--shadow-sm);
}
.activity-clickable {
	cursor: pointer;
	transition: border-color 0.15s;
}
.activity-clickable:hover {
	border-color: #dadada;
}
.activity-badge-col {
	flex-shrink: 0;
}
.activity-content {
	flex: 1;
	min-width: 0;
}
.activity-project {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 3px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.activity-text {
	font-size: 12px;
	color: var(--text-secondary);
	line-height: 1.5;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.activity-meta {
	display: flex;
	gap: 5px;
	font-size: 11px;
	color: var(--text-muted);
	margin-top: 4px;
}
.activity-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 6px;
	flex-shrink: 0;
}
.activity-time {
	font-size: 10px;
	color: var(--text-muted);
}
</style>
