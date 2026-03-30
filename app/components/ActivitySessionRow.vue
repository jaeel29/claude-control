<script setup lang="ts">
export interface SessionGroup {
	sessionId: string;
	project: string;
	isRunning: boolean;
	firstPrompt: string;
	promptCount: number;
	messageCount: number;
	lastTimestamp: string;
	allMessages: {
		role: 'user' | 'assistant';
		text: string;
		fullText: string;
		timestamp: string;
	}[];
}

defineProps<{ group: SessionGroup }>();
defineEmits<{ (e: 'click'): void }>();

function relativeTime(ts: string) {
	const diff = Date.now() - new Date(ts).getTime();
	const m = Math.floor(diff / 60_000);
	if (m < 1) return 'just now';
	if (m < 60) return `${m}m ago`;
	if (m < 1440) return `${Math.floor(m / 60)}h ago`;
	return `${Math.floor(m / 1440)}d ago`;
}

function formatText(text: string) {
	return text
		.replace(/<ide_opened_file>[\s\S]*?opened the file ([^\s<]+)[\s\S]*?<\/ide_opened_file>/g, (_, p) => `@${p.split('/').pop()}`)
		.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')
		.replace(/```[\s\S]*?```/g, '[code block]')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/#{1,4}\s/g, '')
		.trim();
}
</script>

<template>
	<div class="session-row" @click="$emit('click')">
		
		<div class="row-content">
			<div class="row-project">{{ group.project }}</div>
			<div class="row-text">{{ formatText(group.firstPrompt) }}</div>
			<div class="row-meta">
				<span>{{ group.promptCount }} {{ group.promptCount === 1 ? 'prompt' : 'prompts' }}</span>
				<span>·</span>
				<span>{{ group.messageCount }} messages</span>
			</div>
		</div>

		<div class="row-badge">
			<UiBadge v-if="group.isRunning" color="orange" dot :pulse="true">running</UiBadge>
			<UiBadge v-else color="green">done</UiBadge>
		</div>
		<div class="row-right">
			<span class="row-time">{{ relativeTime(group.lastTimestamp) }}</span>
			<Icon name="lucide:chevron-right" size="14" style="color: var(--text-muted); flex-shrink: 0" />
		</div>
	</div>
</template>

<style scoped>
.session-row {
	background: var(--bg-card);
	border: 1px solid transparent;
	border-radius: var(--radius);
	padding: 14px 18px;
	display: flex;
	align-items: center;
	gap: 14px;
	box-shadow: var(--shadow-sm);
	cursor: pointer;
	transition: border-color 0.15s;
}
.session-row:hover {
	border-color: #dadada;
}
.row-badge {
	flex-shrink: 0;
}
.row-content {
	flex: 1;
	min-width: 0;
}
.row-project {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 3px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.row-text {
	font-size: 12px;
	color: var(--text-secondary);
	line-height: 1.5;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.row-meta {
	display: flex;
	gap: 5px;
	font-size: 11px;
	color: var(--text-muted);
	margin-top: 4px;
}
.row-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 6px;
	flex-shrink: 0;
}
.row-time {
	font-size: 10px;
	color: var(--text-muted);
}
</style>
