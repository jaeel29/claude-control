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
	messages: ConversationMessage[];
}

defineProps<{
	modelValue: boolean;
	item: ActivityItem | null;
}>();

defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

function fullDate(ts: string) {
	return new Date(ts).toLocaleString('en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

function cleanSystemTags(text: string) {
	return text
		.replace(
			/<ide_opened_file>[\s\S]*?opened the file ([^\s<]+)[\s\S]*?<\/ide_opened_file>/g,
			(_, path) => `@${path.split('/').pop()}`,
		)
		.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')
		.trim();
}
</script>

<template>
	<Modal :model-value="modelValue" title="Conversation" @update:model-value="$emit('update:modelValue', $event)">
		<div v-if="item">
			<div class="detail-grid">
				<div class="detail-row">
					<span class="detail-label">Project</span>
					<code class="detail-code">{{ item.project }}</code>
				</div>
				<div class="detail-row">
					<span class="detail-label">Time</span>
					<span class="detail-value">{{ fullDate(item.timestamp) }}</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Session</span>
					<code class="detail-code" style="font-size: 10px">{{ item.sessionId || '—' }}</code>
				</div>
				<div class="detail-row">
					<span class="detail-label">Messages</span>
					<span class="detail-value">{{ item.messages.length }}</span>
				</div>
			</div>

			<div class="thread">
				<div v-for="(msg, i) in item.messages" :key="i" :class="['thread-message', msg.role]">
					<div class="thread-role">{{ msg.role }}</div>
					<div class="thread-body">{{ cleanSystemTags(msg.fullText) }}</div>
				</div>
			</div>
		</div>
	</Modal>
</template>

<style scoped>
.detail-grid {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-bottom: 4px;
}
.detail-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
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
	font-size: 12px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	display: block;
	text-align: right;
}

.thread {
	display: flex;
	flex-direction: column;
	gap: 16px;
	border: 1px solid #ededed;
	border-radius: 10px;
	padding: 16px;
}


.thread-message {
	display: flex;
	flex-direction: column;
	gap: 4px;
	max-width: 88%;
}
.thread-message.user {
	align-self: flex-end;
	align-items: flex-end;
}
.thread-message.assistant {
	align-self: flex-start;
	align-items: flex-start;
}
.thread-role {
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--text-muted);
	padding: 0 4px;
}
.thread-body {
	font-size: 12px;
	line-height: 1.5;
	white-space: pre-wrap;
	word-break: break-word;
	padding: 8px 12px;
	border-radius: 8px;
}
.thread-message.user .thread-body {
	background: var(--accent-dim);
	border: 1px solid var(--accent-border);
	color: var(--text-primary);
	border-bottom-right-radius: 4px;
}
.thread-message.assistant .thread-body {
	background: var(--bg-surface);
	border: 1px solid var(--border);
	color: var(--text-secondary);
	border-bottom-left-radius: 4px;
}
</style>
