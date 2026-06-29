<template>
	<!-- Floating reopen button when the rail is hidden -->
	<button v-if="!visible" class="chatw-reopen" type="button" title="Show latest chat" @click="show">
		<Icon name="lucide:message-square" size="18" mode="svg" />
	</button>

	<div v-else class="chatw">
		<!-- Header -->
		<div class="chatw__head">
			<div class="chatw__title">
				<!-- <Icon name="lucide:message-square" size="15" mode="svg" /> -->
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
			<span>{{ threadMessages.length }} messages</span>
			<button v-if="selectedSessionId" class="chatw__latest" type="button" @click="selectChat(null)">
				← latest
			</button>
		</div>

		<!-- Sticky header: the current turn's user prompt stays visible while you
		     scroll its replies. Only the latest prompt above the viewport shows;
		     earlier ones release. -->
		<div v-if="current && (stickyPrompt.text || stickyPrompt.images.length)" class="cc-sticky">
			<span class="cc-user__caret">&gt;</span>
			<div class="cc-sticky__body">
				<span v-if="stickyText" class="cc-sticky__text">{{ stickyText }}</span>
				<div v-if="stickyPrompt.images.length" class="cc-thumbs">
					<img
						v-for="idx in stickyPrompt.images"
						:key="'sticky-' + idx"
						class="cc-thumb"
						:src="`/api/session/${currentSessionId}/image/${idx}`"
						alt="attached image"
						loading="lazy"
						@click="lightbox = `/api/session/${currentSessionId}/image/${idx}`"
					/>
				</div>
			</div>
		</div>

		<!-- Transcript (Claude Code CLI style) -->
		<div ref="chatEl" class="chatw__body" @scroll="onScroll">
			<!-- Skeleton (first load) -->
			<template v-if="showSkeleton">
				<div v-for="n in 6" :key="'sk-' + n" class="chatw__skel-line" :style="{ width: 45 + ((n * 17) % 45) + '%' }" />
			</template>

			<template v-else-if="current">
				<!-- History -->
				<template v-for="(msg, i) in displayMessages" :key="i">
					<!-- Interruption notice -->
					<div v-if="msg.kind === 'interrupt'" class="cc-interrupt">
						⎿ {{ msg.display }}
					</div>
					<!-- User prompt -->
					<div v-else-if="msg.kind === 'user'" class="cc-user" :data-user-prompt="msg.display || 'image'" :data-user-images="msg.images?.join(',') || ''">
						<span class="cc-user__caret">&gt;</span>
						<div class="cc-user__body">
							<span v-if="msg.display" class="cc-user__text">{{ msg.display }}</span>
							<div v-if="msg.images?.length" class="cc-thumbs">
								<img
									v-for="idx in msg.images"
									:key="idx"
									class="cc-thumb"
									:src="`/api/session/${currentSessionId}/image/${idx}`"
									alt="attached image"
									loading="lazy"
									@click="lightbox = `/api/session/${currentSessionId}/image/${idx}`"
								/>
							</div>
						</div>
					</div>
					<!-- TodoWrite checklist -->
					<div v-else-if="msg.kind === 'todos'" class="cc-todos">
						<div class="cc-todos__head">
							<span class="cc-bullet cc-bullet--tool">⏺</span>
							<span class="cc-tool__name">Update Todos</span>
						</div>
						<ul class="cc-todos__list">
							<li v-for="(t, ti) in msg.todos" :key="ti" class="cc-todo" :class="`cc-todo--${t.status}`">
								<span class="cc-todo__box">{{ t.status === 'completed' ? '☒' : '☐' }}</span>
								<span class="cc-todo__text">{{ t.content }}</span>
							</li>
						</ul>
					</div>
					<!-- Tool call -->
					<div v-else-if="msg.kind === 'tool'" class="cc-tool">
						<span class="cc-bullet cc-bullet--tool">⏺</span>
						<span class="cc-tool__name">{{ msg.toolName }}</span><span
							class="cc-tool__paren"
						>(<span class="cc-tool__arg">{{ msg.display }}</span>)</span>
					</div>
					<!-- Assistant text -->
					<div v-else class="cc-assistant">
						<span class="cc-bullet">⏺</span>
						<span class="cc-assistant__text">{{ msg.display }}</span>
					</div>
				</template>

				<!-- Live output -->
				<template v-for="(line, i) in liveOutput" :key="'live-' + i">
					<div v-if="line.type === 'user'" class="cc-user">
						<span class="cc-user__caret">&gt;</span>
						<span class="cc-user__text">{{ line.content }}</span>
					</div>
					<div v-else-if="line.type === 'tool'" class="cc-tool">
						<span class="cc-bullet cc-bullet--tool">⏺</span>
						<span class="cc-tool__name">{{ line.toolName }}</span><span
							class="cc-tool__paren"
						>(<span class="cc-tool__arg">{{ line.content }}</span>)</span>
					</div>
					<div v-else-if="line.type === 'text'" class="cc-assistant">
						<span class="cc-bullet">⏺</span>
						<span class="cc-assistant__text">{{ line.content }}</span>
					</div>
					<div v-else-if="line.type === 'error'" class="cc-result cc-result--error">
						⎿ {{ line.content }}
					</div>
					<div v-else-if="line.type === 'done'" class="cc-result" :class="{ 'cc-result--error': (line.exitCode ?? 0) !== 0 }">
						⎿ {{ line.content }}
					</div>
				</template>

				<!-- Working indicator -->
				<div v-if="isRunning" class="cc-working">
					<span class="cc-bullet cc-bullet--pulse">⏺</span>
					<span class="cc-working__text">Working<span class="cc-working__dots">…</span></span>
				</div>
			</template>

			<div v-else class="chatw__empty">
				<Icon name="lucide:message-square-dashed" size="22" mode="svg" />
				<p>No recent chats yet.</p>
			</div>
		</div>

		<!-- Jump to latest — appears when scrolled up -->
		<button
			v-if="current && !atBottom"
			class="chatw__jump"
			type="button"
			aria-label="Scroll to latest"
			@click="scrollChat"
		>
			<Icon name="lucide:arrow-down" size="16" mode="svg" />
		</button>

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

		<!-- Image lightbox -->
		<div v-if="lightbox" class="cc-lightbox" @click="lightbox = null">
			<button class="cc-lightbox__close" type="button" aria-label="Close">
				<Icon name="lucide:x" size="20" mode="svg" />
			</button>
			<img :src="lightbox" class="cc-lightbox__img" alt="image preview" @click.stop />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ActivityItem, ConversationMessage } from '~/composables/useActivity';

interface OutputLine {
	type: 'user' | 'text' | 'tool' | 'error' | 'system' | 'done';
	content: string;
	toolName?: string;
	exitCode?: number;
}

const { visible, hide, show, initResponsiveDefault } = useChatWidget();
const { selectedSessionId, selectChat } = useSelectedChat();

// Click-to-zoom image preview (src of the image currently in the lightbox).
const lightbox = ref<string | null>(null);
// Data via the shared useActivity() composable (useApi().data → useAsyncData,
// lazy + client-only so it never blocks navigation). `pending` drives the skeleton.
const { items, pending, refresh } = useActivity();

// Skeleton only on the very first load (no data yet) — background polls don't flash it.
const showSkeleton = computed(() => pending.value && items.value.length === 0);

// The auto-picked session id (running, else most recent) — PINNED so it doesn't
// flip on every poll. We only re-pick when the pinned session is gone from the
// list, or none is pinned yet. Without this, with several running sessions
// `current` jumped between them each refresh, so the thread "sometimes" changed.
const autoPinnedId = ref('');
watch(items, (list) => {
	if (!list.length) { autoPinnedId.value = ''; return; }
	const stillThere = autoPinnedId.value && list.some((i) => i.sessionId === autoPinnedId.value);
	if (stillThere) return;
	autoPinnedId.value = (list.find((i) => i.isRunning) ?? list[0]!).sessionId;
}, { immediate: true });

// Which chat to show: the explicitly selected one, else the pinned auto pick.
const current = computed<ActivityItem | null>(() => {
	if (!items.value.length) return null;
	const id = selectedSessionId.value || autoPinnedId.value;
	return items.value.find((i) => i.sessionId === id) ?? items.value[0]!;
});

// /api/activity only returns a truncated, per-TURN slice (often just the latest
// message). Fetch the FULL ordered session thread for whichever chat is current,
// so the widget shows the complete history rather than 1 message.
const currentSessionId = computed(() => current.value?.sessionId || '');
const { data: threadData } = useApi().data<{ messages: ConversationMessage[] }>(
	'session-thread',
	'',
	{ server: false, lazy: true, immediate: false, default: () => ({ messages: [] }) },
);

const { $api } = useNuxtApp();
async function loadThread() {
	const id = currentSessionId.value;
	if (!id) return;
	try {
		// cache-bust so a poll never gets a stale thread from the browser cache
		threadData.value = await $api(`/session/${id}/messages`, { query: { t: Date.now() } });
		// Only stick to the newest message if the user is already at the bottom —
		// never pull them down while they're scrolled up reading history.
		if (atBottom.value) scrollChat();
		else nextTick(updateStickyPrompt);
	} catch {
		threadData.value = { messages: [] };
	}
}

// Reload the full thread whenever the displayed session changes.
watch(currentSessionId, (id) => { if (id) loadThread(); });

// Messages to render: the full thread when available, else the activity fallback.
const threadMessages = computed<ConversationMessage[]>(() => {
	const full = threadData.value?.messages ?? [];
	if (full.length) return full;
	return current.value?.messages ?? [];
});

interface DisplayMessage {
	kind: 'user' | 'assistant' | 'tool' | 'interrupt' | 'todos';
	display: string;
	toolName?: string;
	images?: number[];
	todos?: { content: string; status: 'pending' | 'in_progress' | 'completed' }[];
}

// Build the render list: clean each message's text and DROP entries that become
// empty (pure system-tag noise) so user prompts always show real content and the
// transcript isn't cluttered with blank rows.
const displayMessages = computed<DisplayMessage[]>(() => {
	const out: DisplayMessage[] = [];
	for (const m of threadMessages.value) {
		if (m.role === 'tool') {
			// TodoWrite → checklist; other tools → the ⏺ Name(arg) line.
			if (m.toolName === 'TodoWrite' && m.todos?.length) {
				out.push({ kind: 'todos', display: m.fullText, todos: m.todos });
			} else {
				out.push({ kind: 'tool', display: m.fullText, toolName: m.toolName });
			}
			continue;
		}
		if (m.role === 'user' && m.fullText.startsWith('[Request interrupted')) {
			out.push({ kind: 'interrupt', display: m.fullText.replace(/^\[|\]$/g, '') });
			continue;
		}
		const cleaned = cleanSystemTags(m.fullText);
		// Keep a user message if it has text OR images (image-only prompts count).
		if (!cleaned && !(m.role === 'user' && m.images?.length)) continue;
		out.push({
			kind: m.role === 'user' ? 'user' : 'assistant',
			display: cleaned,
			...(m.role === 'user' && m.images?.length ? { images: m.images } : {}),
		});
	}
	return out;
});

// ── Live streaming (moved from ConversationModal) ──
const chatEl = ref<HTMLElement | null>(null);
const followUp = ref('');
const isRunning = ref(false);
const liveOutput = ref<OutputLine[]>([]);
let es: EventSource | null = null;

// Whether the view is pinned to the bottom. Auto-scroll ONLY happens while this
// is true, so polling never yanks the user down while they read earlier history.
const atBottom = ref(true);
function computeAtBottom() {
	const el = chatEl.value;
	if (!el) return true;
	return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
}

function scrollChat() {
	nextTick(() => {
		if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight;
		atBottom.value = true;
		updateStickyPrompt();
	});
}

// The user prompt of the turn currently in view — shown in the sticky header.
// Carries both the text and any attached image indices so the sticky header can
// render the same clickable thumbnails as the inline row.
const stickyPrompt = ref<{ text: string; images: number[] }>({ text: '', images: [] });
// When the current turn has thumbnails, drop the "🖼 image" placeholder text so
// only the real thumbnails show (and any actual prompt text alongside them).
const stickyText = computed(() => {
	const t = stickyPrompt.value.text;
	if (!stickyPrompt.value.images.length) return t;
	const stripped = t.replace(/🖼 image/g, '').replace(/\s+/g, ' ').trim();
	return stripped;
});
function updateStickyPrompt() {
	const el = chatEl.value;
	if (!el) return;
	const top = el.getBoundingClientRect().top;
	const prompts = el.querySelectorAll<HTMLElement>('[data-user-prompt]');
	let text = '';
	let images: number[] = [];
	// The latest prompt whose top is at or above the container top is the current turn.
	for (const p of prompts) {
		if (p.getBoundingClientRect().top - top <= 8) {
			text = p.dataset.userPrompt || '';
			const raw = p.dataset.userImages || '';
			images = raw ? raw.split(',').map((s) => Number(s)).filter((n) => Number.isInteger(n)) : [];
		} else {
			break;
		}
	}
	stickyPrompt.value = { text, images };
}

let scrollRaf = 0;
function onScroll() {
	if (scrollRaf) return;
	scrollRaf = requestAnimationFrame(() => {
		scrollRaf = 0;
		atBottom.value = computeAtBottom();
		updateStickyPrompt();
	});
}

// Recompute the sticky header when the rendered messages change.
watch(displayMessages, () => nextTick(updateStickyPrompt));

// Switching the displayed conversation resets any in-flight live output and
// jumps to the bottom of the NEW thread (only on an actual session change —
// not on every poll/refresh of the same session).
watch(current, (next, prev) => {
	if (next?.sessionId !== prev?.sessionId) {
		es?.close();
		es = null;
		isRunning.value = false;
		liveOutput.value = [];
		scrollChat();
	}
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
	// Follow the live stream only if the user is at the bottom; if they've
	// scrolled up to read, leave their position alone (the ↓ button returns them).
	if (atBottom.value) scrollChat();
	else updateStickyPrompt();
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
		// "opened file X" → @X (keep a hint of what the user was looking at)
		.replace(/<ide_opened_file>[\s\S]*?opened the file ([^\s<]+)[\s\S]*?<\/ide_opened_file>/g,
			(_, path) => `@${path.split('/').pop()}`)
		// Drop any remaining paired system/IDE blocks entirely
		.replace(/<(ide_selection|ide_opened_file|system-reminder|command-[^>]*)>[\s\S]*?<\/\1>/g, '')
		// Drop any other paired tag blocks
		.replace(/<([a-z0-9_-]+)>[\s\S]*?<\/\1>/gi, '')
		// Drop stray unpaired tags
		.replace(/<\/?[a-z0-9_-]+>/gi, '')
		// Collapse pasted-image markers to a compact chip
		.replace(/\[Image:[^\]]*\]/g, '🖼 image')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

onMounted(() => {
	// Start hidden on small screens so the overlay rail doesn't cover content.
	initResponsiveDefault();
	loadThread(); // initial full-thread load (chatEl now exists)
	scrollChat();
	// Poll for new activity AND reload the current session's full thread so new
	// messages appear as the session continues (the sessionId doesn't change, so
	// the watcher alone wouldn't refetch). Pause while a live run is streaming.
	const t = setInterval(() => {
		if (isRunning.value) return;
		refresh();
		loadThread();
	}, 3000);
	onUnmounted(() => {
		clearInterval(t);
		es?.close();
	});
});
</script>

<style scoped lang="scss">
.chatw {
	position: relative;
	width: 35vw;
	flex-shrink: 0;
	height: 100%;
	min-height: 0;
	display: flex;
	flex-direction: column;
	background: var(--bg-sidebar, var(--color-surface));
	border: 1px solid var(--color-border);
	border-radius: 16px;
	overflow: hidden;

	/* Jump-to-latest pill — floats just above the follow-up input */
	&__jump {
		position: absolute;
		right: 16px;
		bottom: 96px;
		z-index: 8;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border);
		background: var(--bg-card, var(--color-surface));
		color: var(--text-primary, var(--color-text));
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
		cursor: pointer;
		transition: transform 0.12s, background 0.12s;

		&:hover {
			transform: translateY(-1px);
			background: var(--bg-surface, var(--color-surface-muted));
		}
	}

	/* Below lg the rail is too wide to sit in-flow next to sidebar + main, so it
	   becomes a fixed overlay sliding over the content (toggled via the same
	   show/hide state). */
	@include respond-to('lg') {
		position: fixed;
		top: 0;
		right: 0;
		height: 100dvh;
		width: 420px;
		max-width: 92vw;
		z-index: 50;
		box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
	}
	/* On tablets/phones (≤ md) the overlay takes the full screen. */
	@include respond-to('md') {
		width: 100vw;
		max-width: 100vw;
		border-left: none;
	}

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
		font-size: 18px;
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
		padding: 12px;
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

	/* Transcript scroll area — terminal-like, monospace flow (Claude Code CLI) */
	&__body {
		flex: 1;
		overflow-y: auto;
		padding: 20px 18px 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		// font-family: var(--font-mono, 'SF Mono', ui-monospace, Menlo, monospace);
		font-size: 12.5px;
		line-height: 1.65;
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
		font-family: var(--font-sans);
	}

	/* Skeleton lines (first load) */
	&__skel-line {
		height: 14px;
		border-radius: 4px;
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

/* ── Claude Code CLI transcript elements ──────────────────────────────────
   Flowing terminal-style transcript: `>` user prompts, `⏺` bullets for
   assistant/tool lines, `⎿` muted result lines. Monospace via &__body. */

/* User prompt — bordered input block with a caret, like the CLI's prompt box */
/* Sticky header (above the scroll area) — shows the current turn's prompt only.
   Opaque so the transcript never bleeds through it. */
.cc-sticky {
	display: flex;
	gap: 9px;
	align-items: flex-start;
	padding: 11px 16px 11px 14px;
	/* Highlighted active-turn bar: accent left rule + faint accent tint, so the
	   pinned prompt clearly reads as "the current thread", distinct from the
	   in-flow user prompt cards below. */
	// border-left: 3px solid var(--accent, #00b695);
	border-bottom: 1px solid var(--sidebar-border, var(--color-border));
	background: color-mix(in srgb, var(--accent, #00b695) 9%, var(--bg-sidebar, var(--color-surface)));
	box-shadow: 0 6px 12px -8px rgba(0, 0, 0, 0.3);
	font-size: 12.5px;
	line-height: 1.55;
	flex-shrink: 0;
	z-index: 6;

	.cc-user__caret {
		color: var(--accent, #00b695);
		font-weight: 700;
	}

	&__body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	&__text {
		color: var(--text-primary, var(--color-text));
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
}

.cc-user {
	display: flex;
	gap: 8px;
	padding: 11px 13px;
	margin: 6px 0;
	border: 1px solid var(--border, var(--color-border));
	border-radius: 8px;
	background: var(--bg-surface, var(--color-surface-muted));

	&__caret {
		color: var(--accent, #00b695);
		font-weight: 700;
		flex-shrink: 0;
	}
	&__body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}
	&__text {
		color: var(--text-primary, var(--color-text));
		white-space: pre-wrap;
		word-break: break-word;
	}
}

/* Small image thumbnails on a prompt — click opens the lightbox */
.cc-thumbs {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}
.cc-thumb {
	width: 48px;
	height: 48px;
	object-fit: cover;
	border-radius: 6px;
	border: 1px solid var(--border, var(--color-border));
	cursor: zoom-in;
	transition: transform 0.12s, border-color 0.12s;

	&:hover {
		transform: scale(1.04);
		border-color: var(--accent, #00b695);
	}
}

/* TodoWrite checklist */
.cc-todos {
	display: flex;
	flex-direction: column;
	gap: 6px;

	&__head {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	&__list {
		list-style: none;
		margin: 0;
		padding: 0 0 0 18px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
}
.cc-todo {
	display: flex;
	gap: 7px;
	font-size: 12.5px;
	line-height: 1.5;
	color: var(--text-secondary, var(--color-text-muted));

	&__box {
		flex-shrink: 0;
		color: var(--text-muted, var(--color-text-muted));
	}
	&--completed {
		color: var(--text-muted, var(--color-text-muted));
		.cc-todo__box {
			color: var(--accent, #00b695);
		}
		.cc-todo__text {
			text-decoration: line-through;
			opacity: 0.7;
		}
	}
	&--in_progress {
		color: var(--text-primary, var(--color-text));
		font-weight: 500;
		.cc-todo__box {
			color: var(--accent, #00b695);
		}
	}
}

/* Image lightbox overlay */
.cc-lightbox {
	position: fixed;
	inset: 0;
	z-index: 200;
	background: rgba(0, 0, 0, 0.82);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32px;
	cursor: zoom-out;

	&__img {
		max-width: 92vw;
		max-height: 92vh;
		border-radius: 8px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		cursor: default;
	}
	&__close {
		position: absolute;
		top: 18px;
		right: 18px;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;

		&:hover {
			background: rgba(255, 255, 255, 0.22);
		}
	}
}

/* Shared bullet marker — soft gray by default (assistant), accent for tools */
.cc-bullet {
	color: var(--text-muted, var(--color-text-muted));
	opacity: 0.55;
	flex-shrink: 0;
	line-height: 1.6;
	font-size: 10px;

	&--tool {
		color: var(--accent, #00b695);
		opacity: 1;
	}
	&--pulse {
		color: var(--accent, #00b695);
		opacity: 1;
		animation: chatw-pulse 1.2s ease-in-out infinite;
	}
	&--error {
		color: #e5484d;
		opacity: 1;
	}
}

/* Assistant text line */
.cc-assistant {
	display: flex;
	gap: 8px;

	&__text {
		color: var(--text-primary, var(--color-text));
		white-space: pre-wrap;
		word-break: break-word;
	}
}

/* Tool call: ⏺ Name(arg) */
.cc-tool {
	display: flex;
	gap: 8px;
	align-items: baseline;

	&__name {
		color: var(--text-primary, var(--color-text));
		font-weight: 600;
	}
	&__paren {
		color: var(--text-muted, var(--color-text-muted));
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	&__arg {
		color: var(--text-secondary, var(--color-text-muted));
	}
}

/* Muted result / done line: ⎿ … */
.cc-result {
	padding-left: 18px;
	color: var(--text-muted, var(--color-text-muted));
	white-space: pre-wrap;
	word-break: break-word;

	&--error {
		color: #e5484d;
	}
}

/* Interruption notice */
.cc-interrupt {
	padding-left: 18px;
	color: var(--text-muted, var(--color-text-muted));
	font-style: italic;
}

/* Working indicator */
.cc-working {
	display: flex;
	gap: 8px;
	color: var(--text-muted, var(--color-text-muted));

	&__dots {
		animation: chatw-pulse 1.2s ease-in-out infinite;
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

</style>
