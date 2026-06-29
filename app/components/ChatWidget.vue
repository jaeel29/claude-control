<template>
	<!-- Floating reopen button when the rail is hidden -->
	<button v-if="!visible" class="chatw-reopen" type="button" title="Show latest chat" @click="show">
		<Icon name="lucide:message-square" size="18" mode="svg" />
	</button>

	<aside v-else class="chatw">
		<!-- Header -->
		<div class="chatw__head">
			<div class="chatw__title">
				<Icon name="lucide:message-square" size="15" mode="svg" />
				<span>{{ current ? (current.project || 'Conversation') : 'Latest chat' }}</span>
			</div>
			<div class="chatw__head-right">
				<span v-if="current?.isRunning || isRunning" class="chatw__live">
					<span class="chatw__dot" /> live
				</span>
				<button class="chatw__close" type="button" aria-label="Hide chat" title="Hide chat" @click="hide">
					<Icon name="lucide:x" size="15" mode="svg" />
				</button>
			</div>
		</div>

		<!-- Meta strip -->
		<div v-if="current" class="chatw__meta">
			<span>{{ current.sessionId ? '…' + current.sessionId.slice(-6) : '' }}</span>
			<span class="chatw__meta-sep">·</span>
			<span>{{ current.messages.length }} messages</span>
			<button v-if="selectedSessionId" class="chatw__latest" type="button" @click="selectChat(null)">
				← latest
			</button>
		</div>

		<!-- Chat thread -->
		<div ref="chatEl" class="chatw__body">
			<!-- Skeleton (first load) -->
			<template v-if="showSkeleton">
				<div v-for="n in 5" :key="'sk-' + n" class="chatw__row" :class="n % 2 === 0 ? 'user' : 'assistant'">
					<div class="chatw__skel-avatar" />
					<div class="chatw__skel-bubble" :style="{ width: 55 + ((n * 13) % 35) + '%' }" />
				</div>
			</template>

			<template v-else-if="current">
				<!-- History -->
				<template v-for="(msg, i) in current.messages" :key="i">
					<div v-if="msg.role === 'tool'" class="chatw__tool">
						<Icon name="lucide:wrench" size="11" mode="svg" />
						<span class="chatw__tool-name">{{ msg.toolName }}</span>
						<span class="chatw__tool-detail">{{ msg.fullText }}</span>
					</div>
					<div v-else-if="msg.fullText.startsWith('[Request interrupted')" class="chatw__interrupted">
						<Icon name="lucide:ban" size="11" mode="svg" />
						{{ msg.fullText.replace(/^\[|\]$/g, '') }}
					</div>
					<div v-else class="chatw__row" :class="msg.role">
						<div class="chatw__avatar" :class="msg.role">
							<Icon :name="msg.role === 'user' ? 'lucide:user' : 'lucide:bot'" size="11" mode="svg" />
						</div>
						<div class="chatw__bubble" :class="msg.role">{{ cleanSystemTags(msg.fullText) }}</div>
					</div>
				</template>

				<!-- Live output -->
				<template v-for="(line, i) in liveOutput" :key="'live-' + i">
					<div v-if="line.type === 'user'" class="chatw__row user">
						<div class="chatw__avatar user"><Icon name="lucide:user" size="11" mode="svg" /></div>
						<div class="chatw__bubble user">{{ line.content }}</div>
					</div>
					<div v-else-if="line.type === 'tool'" class="chatw__tool">
						<Icon name="lucide:wrench" size="11" mode="svg" />
						<span class="chatw__tool-name">{{ line.toolName }}</span>
						<span class="chatw__tool-detail">{{ line.content }}</span>
					</div>
					<div v-else-if="line.type === 'text'" class="chatw__row assistant">
						<div class="chatw__avatar assistant"><Icon name="lucide:bot" size="11" mode="svg" /></div>
						<div class="chatw__bubble assistant">{{ line.content }}</div>
					</div>
					<div v-else-if="line.type === 'error'" class="chatw__error">
						<Icon name="lucide:alert-circle" size="11" mode="svg" />
						{{ line.content }}
					</div>
					<div v-else-if="line.type === 'done'" class="chatw__done" :class="{ failed: (line.exitCode ?? 0) !== 0 }">
						<Icon :name="(line.exitCode ?? 0) === 0 ? 'lucide:check-circle' : 'lucide:x-circle'" size="11" mode="svg" />
						{{ line.content }}
					</div>
				</template>

				<!-- Typing -->
				<div v-if="isRunning" class="chatw__row assistant">
					<div class="chatw__avatar assistant"><Icon name="lucide:bot" size="11" mode="svg" /></div>
					<div class="chatw__bubble assistant chatw__typing">
						<span class="chatw__tdot" /><span class="chatw__tdot" /><span class="chatw__tdot" />
					</div>
				</div>
			</template>

			<div v-else class="chatw__empty">
				<Icon name="lucide:message-square-dashed" size="22" mode="svg" />
				<p>No recent chats yet.</p>
			</div>
		</div>

		<!-- Follow-up -->
		<div v-if="current" class="chatw__followup" :class="{ 'chatw__followup--running': isRunning }">
			<div class="chatw__followup-label">
				<Icon name="lucide:corner-down-right" size="11" mode="svg" />
				<span v-if="current.sessionId">Continue this session</span>
				<span v-else>Run in this project</span>
			</div>
			<div class="chatw__followup-row">
				<textarea
					v-model="followUp"
					class="chatw__input"
					placeholder="What do you want Claude to do next?"
					rows="2"
					:disabled="isRunning"
					@keydown.meta.enter="send"
				/>
				<div class="chatw__followup-actions">
					<span class="chatw__hint">⌘↵</span>
					<UiButton variant="neutral" size="small" :disabled="!followUp.trim() || isRunning" @click="send">
						<template #icon-left><Icon name="lucide:send" size="12" mode="svg" /></template>
						{{ isRunning ? 'Running…' : 'Run' }}
					</UiButton>
				</div>
			</div>
		</div>
	</aside>
</template>

<script setup lang="ts">
import type { ActivityItem } from '~/composables/useActivity';

interface OutputLine {
	type: 'user' | 'text' | 'tool' | 'error' | 'system' | 'done';
	content: string;
	toolName?: string;
	exitCode?: number;
}

const { visible, hide, show } = useChatWidget();
const { selectedSessionId, selectChat } = useSelectedChat();
// Data via the shared useActivity() composable (useApi().data → useAsyncData,
// lazy + client-only so it never blocks navigation). `pending` drives the skeleton.
const { items, pending, refresh } = useActivity();

// Skeleton only on the very first load (no data yet) — background polls don't flash it.
const showSkeleton = computed(() => pending.value && items.value.length === 0);

// Which chat to show: the explicitly selected one, else the running one, else
// the most recent. This is what makes a row click render here instead of a drawer.
const current = computed<ActivityItem | null>(() => {
	if (!items.value.length) return null;
	if (selectedSessionId.value) {
		return items.value.find((i) => i.sessionId === selectedSessionId.value) ?? items.value[0]!;
	}
	return items.value.find((i) => i.isRunning) ?? items.value[0]!;
});

// ── Live streaming (moved from ConversationModal) ──
const chatEl = ref<HTMLElement | null>(null);
const followUp = ref('');
const isRunning = ref(false);
const liveOutput = ref<OutputLine[]>([]);
let es: EventSource | null = null;

function scrollChat() {
	nextTick(() => {
		if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight;
	});
}

// Switching the displayed conversation resets any in-flight live output.
watch(current, (next, prev) => {
	if (next?.sessionId !== prev?.sessionId) {
		es?.close();
		es = null;
		isRunning.value = false;
		liveOutput.value = [];
	}
	scrollChat();
});

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
			es?.close();
			es = null;
		}
	} catch { /* skip */ }
	scrollChat();
}

async function send() {
	if (!followUp.value.trim() || !current.value?.cwd || isRunning.value) return;
	const prompt = followUp.value.trim();
	followUp.value = '';
	isRunning.value = true;
	liveOutput.value.push({ type: 'user', content: prompt });

	try {
		const res = await $fetch<{ runId: string }>('/api/run', {
			method: 'POST',
			body: {
				prompt,
				cwd: current.value.cwd,
				project: current.value.project,
				resumeSessionId: current.value.sessionId || undefined,
			},
		});
		es = new EventSource(`/api/run/${res.runId}/stream`);
		es.onmessage = (ev) => parseLine(ev.data);
		es.onerror = () => {
			if (isRunning.value) {
				isRunning.value = false;
				liveOutput.value.push({ type: 'error', content: 'Stream connection lost' });
			}
			es?.close();
			es = null;
		};
	} catch (err: any) {
		isRunning.value = false;
		liveOutput.value.push({ type: 'error', content: err?.data?.message ?? String(err) });
	}
}

function cleanSystemTags(text: string) {
	return text
		.replace(/<ide_opened_file>[\s\S]*?opened the file ([^\s<]+)[\s\S]*?<\/ide_opened_file>/g,
			(_, path) => `@${path.split('/').pop()}`)
		.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')
		.trim();
}

onMounted(() => {
	scrollChat();
	// Poll for new activity, but pause while a live run is streaming.
	const t = setInterval(() => { if (!isRunning.value) refresh(); }, 5000);
	onUnmounted(() => {
		clearInterval(t);
		es?.close();
	});
});
</script>

<style scoped lang="scss">
.chatw {
	width: 35vw;
	flex-shrink: 0;
	height: 100dvh;
	display: flex;
	flex-direction: column;
	background: var(--bg-sidebar, var(--color-surface));
	border-left: 1px solid var(--sidebar-border, var(--color-border));

	&__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 16px 10px;
	}

	&__title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary, var(--color-text));
	}

	&__head-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	&__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 7px;
		border: none;
		background: none;
		color: var(--text-muted, var(--color-text-muted));
		cursor: pointer;
		transition: all 0.12s;

		&:hover {
			background: var(--sidebar-hover, var(--color-surface-muted));
			color: var(--text-primary, var(--color-text));
		}
	}

	&__live {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-weight: 600;
		color: var(--red, #ef4444);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	&__dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		animation: chatw-pulse 1.4s ease-in-out infinite;
	}

	&__meta {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 16px 12px;
		border-bottom: 1px solid var(--sidebar-border, var(--color-border));
		font-size: 11px;
		color: var(--text-muted, var(--color-text-muted));
	}

	&__meta-sep {
		opacity: 0.4;
	}

	&__latest {
		margin-left: auto;
		color: var(--accent, #00b695);
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 11px;
		font-weight: 600;
		&:hover {
			text-decoration: underline;
		}
	}

	&__body {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	&__tool {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--text-muted, var(--color-text-muted));
		align-self: flex-start;
		max-width: 92%;
	}

	&__tool-name {
		font-weight: 600;
		color: var(--text-secondary, var(--color-text));
		flex-shrink: 0;
	}

	&__tool-detail {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__row {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		max-width: 92%;

		&.user {
			align-self: flex-end;
			flex-direction: row-reverse;
		}
		&.assistant {
			align-self: flex-start;
		}
	}

	&__avatar {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 2px;

		&.user {
			background: var(--accent, #00b695);
			color: #fff;
		}
		&.assistant {
			background: var(--bg-surface, var(--color-surface-muted));
			border: 1px solid var(--border, var(--color-border));
			color: var(--text-secondary, var(--color-text-muted));
		}
	}

	&__bubble {
		font-size: 13px;
		line-height: 1.5;
		padding: 9px 12px;
		border-radius: 14px;
		white-space: pre-wrap;
		word-break: break-word;

		&.user {
			background: var(--accent, #00b695);
			color: #fff;
			border-bottom-right-radius: 4px;
		}
		&.assistant {
			background: var(--bg-surface, var(--color-surface-muted));
			border: 1px solid var(--border, var(--color-border));
			color: var(--text-primary, var(--color-text));
			border-bottom-left-radius: 4px;
		}
	}

	&__error {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #e53e3e;
		align-self: flex-start;
		padding: 5px 10px;
		background: rgba(229, 62, 62, 0.07);
		border: 1px solid rgba(229, 62, 62, 0.2);
		border-radius: 8px;
	}

	&__done {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11.5px;
		color: var(--text-muted, var(--color-text-muted));
		align-self: center;
		&.failed {
			color: #e53e3e;
		}
	}

	&__interrupted {
		display: flex;
		align-items: center;
		gap: 5px;
		align-self: center;
		font-size: 11px;
		color: var(--text-muted, var(--color-text-muted));
		background: var(--bg-surface, var(--color-surface-muted));
		border: 1px solid var(--border, var(--color-border));
		border-radius: 20px;
		padding: 3px 10px;
	}

	&__typing {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 48px;
	}

	&__tdot {
		width: 6px;
		height: 6px;
		background: var(--text-muted, #9ca3af);
		border-radius: 50%;
		animation: chatw-bounce 1.2s ease-in-out infinite;
		&:nth-child(2) {
			animation-delay: 0.2s;
		}
		&:nth-child(3) {
			animation-delay: 0.4s;
		}
	}

	&__empty {
		margin: auto;
		text-align: center;
		color: var(--text-muted, var(--color-text-muted));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}

	/* ── Skeleton (first load) ── */
	&__skel-avatar {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--bg-surface, var(--color-surface-muted));
		animation: chatw-shimmer 1.3s ease-in-out infinite;
	}

	&__skel-bubble {
		height: 38px;
		border-radius: 14px;
		background: var(--bg-surface, var(--color-surface-muted));
		animation: chatw-shimmer 1.3s ease-in-out infinite;
	}

	/* ── Follow-up ── */
	&__followup {
		border-top: 1px solid var(--sidebar-border, var(--color-border));
		padding: 12px 16px 14px;
		flex-shrink: 0;

		&--running {
			opacity: 0.7;
		}
	}

	&__followup-label {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, var(--color-text-muted));
		margin-bottom: 8px;
	}

	&__followup-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	&__input {
		width: 100%;
		padding: 9px 12px;
		border: 1px solid var(--border, var(--color-border));
		border-radius: var(--radius-sm, 8px);
		background: var(--bg-surface, var(--color-surface));
		color: var(--text-primary, var(--color-text));
		font-size: 13px;
		font-family: inherit;
		resize: none;
		outline: none;
		line-height: 1.5;
		transition: border-color 0.15s;

		&:focus {
			border-color: var(--accent, #00b695);
		}
		&:disabled {
			opacity: 0.5;
		}
	}

	&__followup-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		align-self: flex-end;
	}

	&__hint {
		font-size: 10px;
		color: var(--text-muted, var(--color-text-muted));
	}
}

/* Floating button to reopen the rail after it's been closed */
.chatw-reopen {
	position: fixed;
	right: 20px;
	bottom: 20px;
	z-index: 40;
	width: 44px;
	height: 44px;
	border-radius: 50%;
	border: 1px solid var(--sidebar-border, var(--color-border));
	background: var(--bg-sidebar, var(--color-surface));
	color: var(--text-primary, var(--color-text));
	box-shadow: var(--shadow-card, 0 4px 12px rgba(0, 0, 0, 0.12));
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: transform 0.12s, background 0.12s;

	&:hover {
		transform: translateY(-2px);
		background: var(--sidebar-hover, var(--color-surface-muted));
	}
}

@keyframes chatw-shimmer {
	0%,
	100% {
		opacity: 0.5;
	}
	50% {
		opacity: 1;
	}
}

@keyframes chatw-pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.3;
	}
}

@keyframes chatw-bounce {
	0%,
	80%,
	100% {
		transform: translateY(0);
		opacity: 0.4;
	}
	40% {
		transform: translateY(-5px);
		opacity: 1;
	}
}

/* Hide the rail on narrow screens — the dashboard is desktop-first */
@media (max-width: 1100px) {
	.chatw {
		display: none;
	}
}
</style>
