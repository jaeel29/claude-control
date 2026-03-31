<script setup lang="ts">
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
	aiTitle: string | null;
	messages: ConversationMessage[];
}

interface OutputLine {
	type: 'user' | 'text' | 'tool' | 'error' | 'system' | 'done';
	content: string;
	toolName?: string;
	exitCode?: number;
}

const props = defineProps<{
	modelValue: boolean;
	item: ActivityItem | null;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

const chatEl = ref<HTMLElement | null>(null);
const followUp = ref('');
const isRunning = ref(false);
const liveOutput = ref<OutputLine[]>([]);
let es: EventSource | null = null;

// Scroll chat to bottom when drawer opens
watch(() => props.modelValue, (open) => {
	if (open) {
		liveOutput.value = [];
		setTimeout(() => {
			if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight;
		}, 400);
	} else {
		es?.close();
		es = null;
		isRunning.value = false;
	}
});

function scrollChat() {
	nextTick(() => { if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight; });
}

function parseLine(raw: string) {
	try {
		const e = JSON.parse(raw);
		if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
			for (const block of e.message.content) {
				if (block.type === 'text' && block.text?.trim()) {
					liveOutput.value.push({ type: 'text', content: block.text.trim() });
				} else if (block.type === 'tool_use') {
					const inp = block.input ?? {};
					const detail = inp.file_path
						? inp.file_path.split('/').slice(-2).join('/')
						: inp.command
							? String(inp.command).slice(0, 70)
							: inp.prompt
								? String(inp.prompt).slice(0, 70)
								: JSON.stringify(inp).slice(0, 70);
					liveOutput.value.push({ type: 'tool', content: detail, toolName: block.name });
				}
			}
		} else if (e.type === 'result' && e.result?.trim()) {
			liveOutput.value.push({ type: 'text', content: e.result.trim() });
		} else if (e.type === 'stderr' && e.text?.trim()) {
			liveOutput.value.push({ type: 'error', content: e.text.trim() });
		} else if (e.type === 'done') {
			isRunning.value = false;
			liveOutput.value.push({
				type: 'done',
				content: e.code === 0 ? 'Done' : `Exited with code ${e.code}`,
				exitCode: e.code ?? 0,
			});
			es?.close(); es = null;
		}
	} catch { /* skip */ }
	scrollChat();
}

async function send() {
	if (!followUp.value.trim() || !props.item?.cwd || isRunning.value) return;
	const prompt = followUp.value.trim();
	followUp.value = '';
	isRunning.value = true;
	liveOutput.value = [{ type: 'user', content: prompt }];

	try {
		const res = await $fetch<{ runId: string }>('/api/run', {
			method: 'POST',
			body: {
				prompt,
				cwd: props.item.cwd,
				project: props.item.project,
				resumeSessionId: props.item.sessionId || undefined,
			},
		});
		es = new EventSource(`/api/run/${res.runId}/stream`);
		es.onmessage = (ev) => parseLine(ev.data);
		es.onerror = () => {
			if (isRunning.value) {
				isRunning.value = false;
				liveOutput.value.push({ type: 'error', content: 'Stream connection lost' });
			}
			es?.close(); es = null;
		};
	} catch (err: any) {
		isRunning.value = false;
		liveOutput.value.push({ type: 'error', content: err?.data?.message ?? String(err) });
	}
}

onUnmounted(() => { es?.close(); });

// Helpers
function fullDate(ts: string) {
	return new Date(ts).toLocaleString('en-GB', {
		day: '2-digit', month: 'short', year: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
}

function cleanSystemTags(text: string) {
	return text
		.replace(/<ide_opened_file>[\s\S]*?opened the file ([^\s<]+)[\s\S]*?<\/ide_opened_file>/g,
			(_, path) => `@${path.split('/').pop()}`)
		.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')
		.trim();
}

function msgTime(ts: string) {
	if (!ts) return '';
	return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

</script>

<template>
	<UiDrawer
		:model-value="modelValue"
		position="right"
		:title="item?.project || 'Conversation'"
		@update:model-value="$emit('update:modelValue', $event)"
		:draggable="false"
	>
		<div v-if="item" class="drawer-inner">

			<!-- Session meta -->
			<div class="meta-section">
				<!-- <div class="meta-row">
					<span class="meta-label">Project</span>
					<code class="meta-code">{{ item.project }}</code>
				</div> -->
				<div class="meta-row">
					<span class="meta-label">Started</span>
					<span class="meta-value">{{ fullDate(item.timestamp) }}</span>
				</div>
				<div class="meta-row">
					<span class="meta-label">Session ID</span>
					<code class="meta-code meta-code--sm">{{ item.sessionId || '—' }}</code>
				</div>
				<div class="meta-row">
					<span class="meta-label">Messages</span>
					<span class="meta-value">{{ item.messages.length }}</span>
				</div>
			</div>

			<!-- Chat thread -->
			<div ref="chatEl" class="chat">
				<div class="chat-inner">
					<!-- History messages -->
					<template v-for="(msg, i) in item.messages" :key="i">
						<!-- Tool call pill -->
						<div v-if="msg.role === 'tool'" class="chat-tool">
							<div class="tool-icon-sm" />
							<span class="tool-name-sm">{{ msg.toolName }}</span>
							<span class="tool-detail-sm">{{ msg.fullText }}</span>
						</div>
						<!-- System interruption notice -->
						<div v-else-if="msg.fullText.startsWith('[Request interrupted')" class="chat-interrupted">
							<Icon name="lucide:ban" size="11" />
							{{ msg.fullText.replace(/^\[|\]$/g, '') }}
						</div>
						<!-- User / assistant bubble -->
						<div v-else class="chat-row" :class="msg.role">
							<div class="avatar" :class="msg.role">
								<Icon :name="msg.role === 'user' ? 'lucide:user' : 'lucide:bot'" size="13" mode="svg" />
							</div>
							<div class="bubble-wrap">
								<div class="bubble" :class="msg.role">{{ cleanSystemTags(msg.fullText) }}</div>
								<div class="bubble-time" :class="msg.role">{{ msgTime(msg.timestamp) }}</div>
							</div>
						</div>
					</template>

					<!-- Live output inline in chat -->
					<template v-for="(line, i) in liveOutput" :key="'live-' + i">
						<!-- User message bubble -->
						<div v-if="line.type === 'user'" class="chat-row user">
							<div class="avatar user">
								<Icon name="lucide:user" size="13" mode="svg" />
							</div>
							<div class="bubble-wrap">
								<div class="bubble user">{{ line.content }}</div>
							</div>
						</div>
						<!-- Tool call pill -->
						<div v-else-if="line.type === 'tool'" class="chat-tool">
							<div class="tool-icon-sm" />
							<span class="tool-name-sm">{{ line.toolName }}</span>
							<span class="tool-detail-sm">{{ line.content }}</span>
						</div>
						<!-- Assistant text bubble -->
						<div v-else-if="line.type === 'text'" class="chat-row assistant">
							<div class="avatar assistant">
								<Icon name="lucide:bot" size="13" mode="svg" />
							</div>
							<div class="bubble-wrap">
								<div class="bubble assistant">{{ line.content }}</div>
							</div>
						</div>
						<!-- Error -->
						<div v-else-if="line.type === 'error'" class="chat-error">
							<Icon name="lucide:alert-circle" size="11" />
							{{ line.content }}
						</div>
						<!-- Done -->
						<div v-else-if="line.type === 'done'" class="chat-done" :class="{ failed: (line.exitCode ?? 0) !== 0 }">
							<Icon :name="(line.exitCode ?? 0) === 0 ? 'lucide:check-circle' : 'lucide:x-circle'" size="11" />
							{{ line.content }}
						</div>
					</template>

					<!-- Typing indicator -->
					<div v-if="isRunning" class="chat-row assistant">
						<div class="avatar assistant">
							<Icon name="lucide:bot" size="13" mode="svg" />
						</div>
						<div class="bubble assistant typing">
							<span class="dot" /><span class="dot" /><span class="dot" />
						</div>
					</div>
				</div>
			</div>

			<!-- Follow-up input -->
			<div class="followup" :class="{ 'followup--running': isRunning }">
				<div class="followup-label">
					<Icon name="lucide:corner-down-right" size="11" />
					<span v-if="item.sessionId">Continue this session</span>
					<span v-else>Run in this project</span>
				</div>
				<div class="followup-row">
					<textarea
						v-model="followUp"
						class="followup-input"
						placeholder="What do you want Claude to do next?"
						rows="2"
						:disabled="isRunning"
						@keydown.meta.enter="send"
					/>
					<div class="followup-actions">
						<span class="followup-hint">⌘↵</span>
						<UiButton variant="neutral" size="small" :disabled="!followUp.trim() || isRunning" @click="send">
							<template #icon-left><Icon name="lucide:send" size="12" /></template>
							{{ isRunning ? 'Running…' : 'Run' }}
						</UiButton>
					</div>
				</div>
			</div>

		</div>
	</UiDrawer>
</template>

<style scoped>
.drawer-inner {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

/* ── Meta ── */
.meta-section {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 14px 20px;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}
.meta-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 5px 0;
}
.meta-label { font-size: 12px; color: var(--text-secondary); flex-shrink: 0; }
.meta-value { font-size: 12px; color: var(--text-primary); }
.meta-code {
	font-size: 12px; color: var(--text-primary);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	max-width: 260px; display: block; text-align: right;
}
.meta-code--sm { font-size: 10px; color: var(--text-muted); }

/* ── Chat ── */
.chat {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
	min-height: 0;
}
.chat-inner {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	min-height: 100%;
	gap: 16px;
}
.chat-row { display: flex; align-items: flex-start; gap: 10px; max-width: 92%; }
.chat-row.user { align-self: flex-end; flex-direction: row-reverse; }
.chat-row.assistant { align-self: flex-start; }

.avatar {
	width: 26px; height: 26px; border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	flex-shrink: 0; margin-top: 2px;
}
.avatar.user { background: var(--accent, #00b695); color: #fff; }
.avatar.assistant {
	background: var(--bg-surface, #f4f5f7);
	border: 1px solid var(--border, #e5e7eb);
	color: var(--text-secondary, #666);
}
.bubble-wrap { display: flex; flex-direction: column; gap: 3px; }
.bubble {
	font-size: 13px; line-height: 1.55;
	white-space: pre-wrap; word-break: break-word;
	padding: 10px 14px; border-radius: 16px;
}
.bubble.user {
	background: var(--accent, #00b695); color: #fff;
	border-bottom-right-radius: 4px;
}
.bubble.assistant {
	background: var(--bg-surface, #f4f5f7);
	border: 1px solid var(--border, #e5e7eb);
	color: var(--text-primary, #111);
	border-bottom-left-radius: 4px;
}
.bubble-time { font-size: 10px; color: var(--text-muted); }
.bubble-time.user { text-align: right; }

/* ── Live inline elements ── */
.chat-tool {
	display: flex;
	align-items: center;
	gap: 6px;
	align-self: flex-start;
	max-width: 88%;
}
.tool-icon-sm {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--accent);
	flex-shrink: 0;
}
.tool-name-sm {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-primary);
	flex-shrink: 0;
}
.tool-detail-sm {
	font-size: 12px;
	color: var(--text-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.chat-error {
	display: flex; align-items: center; gap: 6px;
	font-size: 12px; color: #e53e3e;
	align-self: flex-start;
	padding: 5px 10px;
	background: rgba(229, 62, 62, 0.07);
	border: 1px solid rgba(229, 62, 62, 0.2);
	border-radius: 8px;
}
.chat-done {
	display: flex; align-items: center; gap: 6px;
	font-size: 11.5px; color: var(--text-muted);
	align-self: center;
}
.chat-done.failed { color: #e53e3e; }
.chat-interrupted {
	display: flex; align-items: center; gap: 5px;
	align-self: center;
	font-size: 11px; color: var(--text-muted);
	background: var(--bg-surface);
	border: 1px solid var(--border);
	border-radius: 20px;
	padding: 3px 10px;
}

/* Typing indicator */
.bubble.typing {
	display: flex; align-items: center; gap: 4px;
	padding: 12px 16px;
	min-width: 52px;
}
.dot {
	width: 6px; height: 6px;
	background: var(--text-muted);
	border-radius: 50%;
	animation: bounce 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
	0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
	40% { transform: translateY(-5px); opacity: 1; }
}

/* ── Follow-up ── */
.followup {
	border-top: 1px solid var(--border);
	padding: 14px 20px 16px;
	flex-shrink: 0;
}
.followup--running { opacity: 0.7; }
.followup-label {
	display: flex; align-items: center; gap: 5px;
	font-size: 11px; font-weight: 600; color: var(--text-muted);
	margin-bottom: 8px;
}
.followup-row { display: flex; flex-direction: column; gap: 8px; }
.followup-input {
	width: 100%;
	padding: 9px 12px;
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	background: var(--bg-surface);
	color: var(--text-primary);
	font-size: 13px;
	font-family: inherit;
	resize: none;
	outline: none;
	line-height: 1.5;
	transition: border-color 0.15s;
}
.followup-input:focus { border-color: var(--accent); }
.followup-input::placeholder { color: var(--text-muted); }
.followup-input:disabled { opacity: 0.5; }
.followup-actions { display: flex; align-items: center; gap: 6px; align-self: flex-end; }
.followup-hint { font-size: 10px; color: var(--text-muted); }
</style>
