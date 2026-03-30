<script setup lang="ts">
// ── Projects ───────────────────────────────────────────────
const { data: projectsData } = await useFetch('/api/projects');
const availableProjects = computed(() => (projectsData.value?.projects ?? []).filter((p) => p.path));

const projectOptions = computed(() => availableProjects.value.map((p) => ({ value: p.path!, label: p.name })));

// ── Form state ─────────────────────────────────────────────
const selectedPath = ref('');
const prompt = ref('');

watch(
	availableProjects,
	(projects) => {
		if (projects.length && !selectedPath.value) {
			selectedPath.value = projects[0]?.path ?? '';
		}
	},
	{ once: true, immediate: true },
);

const activeCwd = computed(() => selectedPath.value);
const activeProject = computed(() => availableProjects.value.find((p) => p.path === selectedPath.value)?.name ?? '');

// ── Types ─────────────────────────────────────────────────
interface OutputLine {
	type: 'text' | 'tool' | 'result' | 'error' | 'system' | 'done';
	content: string;
	toolName?: string;
	exitCode?: number;
	cost?: number;
}

interface Job {
	id: string;
	prompt: string;
	project: string;
	cwd: string;
	status: 'running' | 'done' | 'failed' | 'stopped';
	output: OutputLine[];
	startedAt: string;
	exitCode?: number;
	sessionId?: string;
	es?: EventSource;
}

// ── Job list ──────────────────────────────────────────────
const jobs = ref<Job[]>([]);

// ── History ───────────────────────────────────────────────
const { data: historyData, refresh: refreshHistory } = await useFetch('/api/run/history');
const pastRuns = computed(() => {
	const ids = new Set(jobs.value.map((j) => j.id));
	return (historyData.value?.history ?? []).filter((h) => !ids.has(h.id));
});

// ── Dispatch modal ────────────────────────────────────────
const showDispatch = ref(false);

function openDispatch() {
	prompt.value = '';
	showDispatch.value = true;
}

function closeDispatch() {
	showDispatch.value = false;
}

// ── Detail modal ─────────────────────────────────────────
const modalJob = ref<Job | null>(null);
const modalPastRun = ref<(typeof pastRuns.value)[number] | null>(null);
const followUpPrompt = ref('');
const followUpRunning = ref(false);
const terminalEl = ref<HTMLElement | null>(null);

function openJobModal(job: Job) {
	modalJob.value = job;
	modalPastRun.value = null;
	followUpPrompt.value = '';
	nextTick(scrollTerminal);
}

function openPastModal(entry: (typeof pastRuns.value)[number]) {
	modalPastRun.value = entry;
	modalJob.value = null;
	followUpPrompt.value = '';
}

function closeDetailModal() {
	modalJob.value = null;
	modalPastRun.value = null;
	followUpPrompt.value = '';
}

const showDetailModal = computed({
	get: () => !!(modalJob.value || modalPastRun.value),
	set: (v) => { if (!v) closeDetailModal(); },
});

function scrollTerminal() {
	if (terminalEl.value) terminalEl.value.scrollTop = terminalEl.value.scrollHeight;
}

onMounted(() => {});

// ── Stream parser ─────────────────────────────────────────
function parseLine(job: Job, raw: string) {
	try {
		const e = JSON.parse(raw);
		if (e.type === 'system' && e.subtype === 'init') {
			if (e.session_id) job.sessionId = e.session_id;
			job.output.push({
				type: 'system',
				content: `Session ${e.session_id?.slice(0, 8) ?? ''}  •  ${e.tools?.length ?? 0} tools`,
			});
		} else if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
			for (const block of e.message.content) {
				if (block.type === 'text' && block.text?.trim()) {
					job.output.push({ type: 'text', content: block.text.trim() });
				} else if (block.type === 'tool_use') {
					const inp = block.input ?? {};
					const detail = inp.file_path
						? inp.file_path.split('/').slice(-2).join('/')
						: inp.command
							? String(inp.command).slice(0, 70)
							: inp.prompt
								? String(inp.prompt).slice(0, 70)
								: JSON.stringify(inp).slice(0, 70);
					job.output.push({ type: 'tool', content: detail, toolName: block.name });
				}
			}
		} else if (e.type === 'result') {
			if (e.result?.trim()) job.output.push({ type: 'result', content: e.result.trim(), cost: e.usage?.cost_usd });
		} else if (e.type === 'stderr') {
			if (e.text?.trim()) job.output.push({ type: 'error', content: e.text.trim() });
		} else if (e.type === 'done') {
			job.exitCode = e.code ?? 0;
			job.status = e.code === 0 ? 'done' : 'failed';
			job.output.push({
				type: 'done',
				content: e.code === 0 ? 'Completed' : `Exited with code ${e.code}`,
				exitCode: e.code ?? 0,
			});
			job.es?.close();
			job.es = undefined;
			refreshHistory();
		}
	} catch {
		if (raw.trim()) job.output.push({ type: 'text', content: raw });
	}
	if (modalJob.value?.id === job.id) nextTick(scrollTerminal);
}

// ── Dispatch ──────────────────────────────────────────────
async function startRun(
	p: string = prompt.value,
	cwd: string = activeCwd.value,
	project: string = activeProject.value,
	resumeSessionId?: string,
) {
	if (!p.trim() || !cwd) return;

	const job: Job = {
		id: '',
		prompt: p.trim(),
		project,
		cwd,
		status: 'running',
		output: [],
		startedAt: new Date().toISOString(),
	};

	try {
		const res = await $fetch<{ runId: string }>('/api/run', {
			method: 'POST',
			body: { prompt: job.prompt, cwd, project, resumeSessionId },
		});
		job.id = res.runId;
		jobs.value.unshift(job);
		if (p === prompt.value) {
			prompt.value = '';
			closeDispatch();
		}

		const es = new EventSource(`/api/run/${res.runId}/stream`);
		job.es = es;
		es.onmessage = (ev) => parseLine(job, ev.data);
		es.onerror = () => {
			if (job.status === 'running') {
				job.status = 'failed';
				job.output.push({ type: 'error', content: 'Stream connection lost' });
			}
			es.close();
			job.es = undefined;
		};
		return job;
	} catch (err: any) {
		job.id = `err-${Date.now()}`;
		job.status = 'failed';
		job.output.push({ type: 'error', content: err?.data?.message ?? String(err) });
		jobs.value.unshift(job);
		return job;
	}
}

async function stopJob(job: Job) {
	await $fetch(`/api/run/${job.id}/kill`, { method: 'POST' });
	job.status = 'stopped';
	job.es?.close();
	job.es = undefined;
	job.output.push({ type: 'done', content: 'Stopped by user', exitCode: -1 });
	refreshHistory();
}

async function runFollowUp() {
	const src = modalJob.value ?? modalPastRun.value;
	if (!src || !followUpPrompt.value.trim()) return;
	followUpRunning.value = true;
	const sessionId = modalJob.value?.sessionId ?? (modalPastRun.value as any)?.sessionId;
	const newJob = await startRun(followUpPrompt.value.trim(), src.cwd, src.project, sessionId);
	followUpPrompt.value = '';
	followUpRunning.value = false;
	if (newJob) {
		modalJob.value = newJob;
		modalPastRun.value = null;
		nextTick(scrollTerminal);
	}
}

// ── Helpers ───────────────────────────────────────────────
const STATUS_COLOR: Record<string, 'teal' | 'green' | 'red' | 'gray'> = {
	running: 'teal',
	done: 'green',
	failed: 'red',
	stopped: 'gray',
};
function statusColor(s: string) {
	return STATUS_COLOR[s] ?? 'gray';
}

function relativeTime(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60000),
		h = Math.floor(m / 60),
		d = Math.floor(h / 24);
	if (d > 0) return `${d}d ago`;
	if (h > 0) return `${h}h ago`;
	if (m > 0) return `${m}m ago`;
	return 'just now';
}

const toolIcons: Record<string, string> = {
	Read: '📖',
	Write: '✏️',
	Edit: '✏️',
	MultiEdit: '✏️',
	Bash: '⚡',
	Glob: '🔍',
	Grep: '🔍',
	Agent: '🤖',
	WebFetch: '🌐',
	WebSearch: '🌐',
	TodoWrite: '📋',
	TodoRead: '📋',
};
function toolIcon(name: string) {
	return toolIcons[name] ?? '🔧';
}

onUnmounted(() => {
	for (const j of jobs.value) j.es?.close();
});
</script>

<template>
	<div class="page">
		<div class="page-header">
			<div>
				<h1 class="page-title">Run</h1>
				<p class="page-subtitle">Dispatch Claude Code tasks — runs in background, click any task to view details</p>
			</div>
			<div class="header-actions">
				<UiBadge v-if="jobs.some((j) => j.status === 'running')" color="teal" size="md" dot :pulse="true">
					{{ jobs.filter((j) => j.status === 'running').length }} running
				</UiBadge>
				<UiButton variant="neutral" size="small" @click="openDispatch">
					<template #icon-left><Icon name="lucide:plus" size="14" /></template>
					New Task
				</UiButton>
			</div>
		</div>

		<!-- ── Task list ── -->
		<div v-if="jobs.length || pastRuns.length" class="task-list">
			<template v-if="jobs.length">
				<div class="list-group-label">This session</div>
				<div v-for="job in jobs" :key="job.id" class="task-row" @click="openJobModal(job)">
					<UiBadge :color="statusColor(job.status)" :dot="job.status === 'running'" :pulse="job.status === 'running'">
						{{
							job.status === 'running'
								? 'Running'
								: job.status === 'done'
									? 'Completed'
									: job.status === 'failed'
										? 'Failed'
										: 'Stopped'
						}}
					</UiBadge>
					<span class="task-project">{{ job.project }}</span>
					<span class="task-prompt">{{ job.prompt }}</span>
					<span class="task-time">{{ relativeTime(job.startedAt) }}</span>
					<Icon name="lucide:chevron-right" size="13" class="task-arrow" />
				</div>
			</template>

			<template v-if="pastRuns.length">
				<div class="list-group-label" :style="jobs.length ? 'margin-top:16px' : ''">Previous runs</div>
				<div v-for="entry in pastRuns" :key="entry.id" class="task-row" @click="openPastModal(entry)">
					<UiBadge :color="entry.exitCode === 0 ? 'green' : 'red'">
						{{ entry.exitCode === 0 ? 'Completed' : 'Failed' }}
					</UiBadge>
					<span class="task-project">{{ entry.project }}</span>
					<span class="task-prompt">{{ entry.prompt }}</span>
					<span class="task-time">{{ relativeTime(entry.startedAt) }}</span>
					<Icon name="lucide:chevron-right" size="13" class="task-arrow" />
				</div>
			</template>
		</div>

		<div v-else class="empty-state">
			<Icon name="lucide:layers" size="30" style="opacity: 0.12; display: block; margin: 0 auto 12px" />
			No tasks yet — click <strong>New Task</strong> to dispatch one
		</div>

		<!-- ── Dispatch modal ── -->
		<Modal v-model="showDispatch" title="New Task" max-width="520px" :auto-height="true">
			<div class="form-field">
				<label class="form-label">Project</label>
				<UiDropdown
					v-model="selectedPath"
					:options="projectOptions"
					:searchable="true"
					:full-width="true"
					placeholder="Select a project…"
				/>
			</div>
			<div v-if="activeCwd" class="form-field">
				<label class="form-label">Path</label>
				<code class="active-path">{{ activeCwd }}</code>
			</div>
			<div class="form-field">
				<label class="form-label">Prompt</label>
				<div class="prompt-wrap">
					<textarea
						v-model="prompt"
						class="form-textarea"
						placeholder="Describe what you want Claude to do…"
						rows="4"
						autofocus
						@keydown.meta.enter="startRun()"
					/>
					<span class="prompt-hint">⌘↵ to dispatch</span>
				</div>
			</div>
			<template #footer>
				<div class="modal-footer-actions">
					<UiButton variant="outline" size="medium" @click="showDispatch = false">Cancel</UiButton>
					<UiButton variant="neutral" size="medium" :disabled="!prompt.trim() || !activeCwd" @click="startRun()">
						<template #icon-left><Icon name="lucide:send" size="14" /></template>
						Dispatch Task
					</UiButton>
				</div>
			</template>
		</Modal>

		<!-- ── Detail modal ── -->
		<Modal v-model="showDetailModal" max-width="760px">
			<template #title>
				<div class="modal-title-row">
					<UiBadge
						size="md"
						:color="statusColor(modalJob ? modalJob.status : modalPastRun!.exitCode === 0 ? 'done' : 'failed')"
						:dot="modalJob?.status === 'running'"
						:pulse="modalJob?.status === 'running'"
					>
						{{
							modalJob
								? modalJob.status === 'running'
									? 'Running'
									: modalJob.status === 'done'
										? 'Completed'
										: modalJob.status === 'failed'
											? 'Failed'
											: 'Stopped'
								: modalPastRun!.exitCode === 0
									? 'Completed'
									: 'Failed'
						}}
					</UiBadge>
					<span class="modal-project">{{ modalJob?.project ?? modalPastRun?.project }}</span>
				</div>
			</template>

			<div class="modal-prompt">{{ modalJob?.prompt ?? modalPastRun?.prompt }}</div>
			<div class="modal-meta">
				<span><Icon name="lucide:folder" size="11" /> {{ modalJob?.cwd ?? modalPastRun?.cwd }}</span>
				<span
					><Icon name="lucide:clock" size="11" />
					{{ new Date(modalJob?.startedAt ?? modalPastRun?.startedAt ?? '').toLocaleString() }}</span
				>
			</div>

			<!-- Live terminal -->
			<div v-if="modalJob" class="modal-terminal" ref="terminalEl">
				<template v-for="(line, i) in modalJob.output" :key="i">
					<div v-if="line.type === 'system'" class="line line-system">
						<Icon name="lucide:terminal" size="10" class="line-icon" /> {{ line.content }}
					</div>
					<div v-else-if="line.type === 'text'" class="line line-text">
						<span class="line-prefix">›</span><span class="line-body">{{ line.content }}</span>
					</div>
					<div v-else-if="line.type === 'tool'" class="line line-tool">
						<span class="tool-badge">
							<span class="tool-icon">{{ toolIcon(line.toolName!) }}</span>
							<span class="tool-name">{{ line.toolName }}</span>
						</span>
						<span class="tool-detail">{{ line.content }}</span>
					</div>
					<div v-else-if="line.type === 'result'" class="line line-result">
						<div class="result-header">
							<Icon name="lucide:check-circle" size="11" /> Result
							<span v-if="line.cost" class="result-cost">${{ line.cost.toFixed(4) }}</span>
						</div>
						<div class="result-body">{{ line.content }}</div>
					</div>
					<div v-else-if="line.type === 'error'" class="line line-error">
						<Icon name="lucide:alert-circle" size="10" class="line-icon" /> {{ line.content }}
					</div>
					<div
						v-else-if="line.type === 'done'"
						class="line line-done"
						:class="{ failed: (line.exitCode ?? 0) !== 0 }"
					>
						<Icon :name="(line.exitCode ?? 0) === 0 ? 'lucide:check' : 'lucide:x'" size="10" class="line-icon" />
						{{ line.content }}
					</div>
				</template>
				<div v-if="modalJob.status === 'running'" class="cursor-line"><span class="cursor">▋</span></div>
			</div>

			<!-- Past run preview -->
			<div v-else-if="modalPastRun?.outputPreview" class="modal-preview">
				<div class="preview-label">Output preview</div>
				<div class="preview-text">{{ modalPastRun.outputPreview }}</div>
			</div>

			<template #footer>
				<div class="modal-followup">
					<div class="followup-label">
						<Icon name="lucide:corner-down-right" size="12" />
						<span v-if="modalJob?.sessionId || (modalPastRun as any)?.sessionId">
							Continue this conversation <span class="resume-hint">— resumes same session</span>
						</span>
						<span v-else>Run another prompt in this project</span>
					</div>
					<div class="followup-row">
						<textarea
							v-model="followUpPrompt"
							class="form-textarea sm"
							placeholder="What do you want Claude to do next?"
							rows="2"
							:disabled="followUpRunning"
							@keydown.meta.enter="runFollowUp"
						/>
						<div class="followup-actions">
							<span class="followup-hint">⌘↵</span>
							<UiButton
								v-if="modalJob?.status === 'running'"
								variant="danger"
								size="small"
								@click="stopJob(modalJob!)"
							>
								<template #icon-left><Icon name="lucide:square" size="12" /></template>
								Stop
							</UiButton>
							<UiButton
								variant="neutral"
								size="small"
								:disabled="!followUpPrompt.trim() || followUpRunning"
								@click="runFollowUp"
							>
								<template #icon-left><Icon name="lucide:send" size="12" /></template>
								Run
							</UiButton>
						</div>
					</div>
				</div>
			</template>
		</Modal>
	</div>
</template>

<style scoped>
/* ── Page ── */
.page-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
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
.header-actions {
	display: flex;
	align-items: center;
	gap: 10px;
}
/* ── Task list ── */
.task-list {
	display: flex;
	flex-direction: column;
	gap: 3px;
}
.list-group-label {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--text-muted);
	padding: 4px 2px 6px;
}
.task-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 11px 14px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	cursor: pointer;
	transition: all 0.15s;
}
.task-row:hover {
	border-color: #dadada;
	/* background: var(--bg-surface); */
}
.task-project {
	font-size: 11px;
	font-weight: 600;
	color: var(--text-muted);
	background: var(--bg-surface);
	border: 1px solid var(--border);
	padding: 1px 8px;
	border-radius: 10px;
	flex-shrink: 0;
	white-space: nowrap;
}
.task-prompt {
	flex: 1;
	font-size: 12.5px;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.task-time {
	font-size: 11px;
	color: var(--text-muted);
	flex-shrink: 0;
	white-space: nowrap;
}
.task-arrow {
	opacity: 0.3;
	flex-shrink: 0;
}

/* ── Empty ── */
.empty-state {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 72px 20px;
	text-align: center;
	color: var(--text-muted);
	font-size: 13px;
}

/* ── Modal title slot content ── */
.modal-title-row {
	display: flex;
	align-items: center;
	gap: 10px;
}
.modal-project {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-primary);
}
.modal-footer-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

/* ── Dispatch modal form ── */
.form-field {
	/* padding: 14px 20px; */
}
.form-label {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-muted);
	display: block;
	margin-bottom: 7px;
}
.form-input {
	width: 100%;
	height: 36px;
	padding: 0 12px;
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	background: var(--bg-surface);
	color: var(--text-primary);
	font-size: 13px;
	font-family: 'SF Mono', monospace;
	outline: none;
	transition: border-color 0.15s;
}
.form-input:focus {
	border-color: #111827;
	box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.07);
}
.active-path {
	font-family: 'SF Mono', monospace;
	font-size: 11px;
	color: var(--text-muted);
	word-break: break-all;
}
.prompt-wrap {
	position: relative;
}
.form-textarea {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	background: var(--bg-surface);
	color: var(--text-primary);
	font-size: 13px;
	font-family: inherit;
	resize: vertical;
	outline: none;
	line-height: 1.6;
	box-sizing: border-box;
	transition: border-color 0.15s;
}
.form-textarea:focus {
	border-color: #111827;
	box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.07);
}
.form-textarea::placeholder {
	color: var(--text-muted);
}
.form-textarea:disabled {
	opacity: 0.5;
}
.form-textarea.sm {
	font-size: 12.5px;
}
.prompt-hint {
	position: absolute;
	bottom: 8px;
	right: 10px;
	font-size: 10px;
	color: var(--text-muted);
	pointer-events: none;
}

/* ── Detail modal ── */
.modal-prompt {
	font-size: 13.5px;
	color: var(--text-primary);
	line-height: 1.5;
	flex-shrink: 0;
	margin-bottom: 6px;
}
.modal-meta {
	display: flex;
	gap: 18px;
	flex-wrap: wrap;
	padding-bottom: 14px;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
	margin: 0 -22px;
	padding-left: 22px;
	padding-right: 22px;
}
.modal-meta span {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 11px;
	color: var(--text-muted);
	font-family: 'SF Mono', monospace;
}

.modal-terminal {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
	background: #0d1117;
	padding: 14px 18px;
	display: flex;
	flex-direction: column;
	gap: 3px;
	font-family: 'SF Mono', 'Fira Code', monospace;
	font-size: 12px;
	line-height: 1.75;
	scroll-behavior: smooth;
	margin: 14px -22px -22px;
	border-radius: 0 0 16px 16px;
}
.modal-terminal::-webkit-scrollbar {
	width: 5px;
}
.modal-terminal::-webkit-scrollbar-thumb {
	background: #30363d;
	border-radius: 3px;
}

.line {
	display: flex;
	align-items: flex-start;
	gap: 7px;
}
.line-icon {
	flex-shrink: 0;
	margin-top: 3px;
	opacity: 0.5;
}
.line-system {
	color: #484f58;
	font-size: 10.5px;
	padding: 2px 0;
}
.line-text {
	color: #e6edf3;
}
.line-prefix {
	color: #3fb950;
	flex-shrink: 0;
	font-weight: 700;
}
.line-body {
	white-space: pre-wrap;
	word-break: break-word;
}
.line-tool {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 3px 8px;
	border-radius: 4px;
	background: rgba(31, 111, 235, 0.08);
	border-left: 2px solid #1f6feb;
	margin: 1px 0;
}
.tool-badge {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	flex-shrink: 0;
}
.tool-icon {
	font-size: 10px;
}
.tool-name {
	color: #79c0ff;
	font-size: 11px;
	font-weight: 600;
}
.tool-detail {
	color: #8b949e;
	font-size: 11px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.line-result {
	background: rgba(63, 185, 80, 0.08);
	border: 1px solid rgba(63, 185, 80, 0.2);
	border-radius: 5px;
	padding: 8px 10px;
	margin: 4px 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.result-header {
	display: flex;
	align-items: center;
	gap: 5px;
	color: #3fb950;
	font-size: 10.5px;
	font-weight: 600;
}
.result-cost {
	margin-left: auto;
	color: #484f58;
	font-weight: 400;
}
.result-body {
	color: #e6edf3;
	white-space: pre-wrap;
	word-break: break-word;
}
.line-error {
	color: #f85149;
}
.line-done {
	display: flex;
	align-items: center;
	gap: 5px;
	color: #3fb950;
	font-size: 10.5px;
	padding: 4px 0 2px;
	border-top: 1px solid #21262d;
	margin-top: 4px;
}
.line-done.failed {
	color: #f85149;
}
.cursor-line {
	padding: 2px 0;
}
.cursor {
	color: #3fb950;
	animation: blink 1s step-end infinite;
}
@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0;
	}
}

.modal-preview {
	flex: 1;
	padding: 20px;
	background: var(--bg-surface);
	overflow-y: auto;
	min-height: 80px;
	margin: 0px -22px -22px;
	/* border-radius: 0 0 16px 16px; */
}
.preview-label {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.07em;
	color: var(--text-muted);
	margin-bottom: 8px;
}
.preview-text {
	font-size: 12.5px;
	color: var(--text-secondary);
	line-height: 1.6;
	white-space: pre-wrap;
}

.modal-followup {
	/* padding: 14px 22px 16px; */
	/* border-top: 1px solid var(--border); */
	flex-shrink: 0;
}
.followup-label {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	font-weight: 600;
	color: var(--text-muted);
	margin-bottom: 8px;
}
.resume-hint {
	font-size: 10px;
	font-weight: 400;
	color: var(--accent);
}
.followup-row {
	display: flex;
  flex-direction: column;
	gap: 10px;
	align-items: flex-end;

}
.followup-actions {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-shrink: 0;
}
.followup-hint {
	font-size: 10px;
	color: var(--text-muted);
}
</style>
