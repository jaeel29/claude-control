<script setup lang="ts">
interface DailyUsage {
	date: string;
	cost: number;
	inputTokens: number;
	outputTokens: number;
	sessions: number;
}
interface ProjectUsage {
	project: string;
	cost: number;
	inputTokens: number;
	outputTokens: number;
	sessions: number;
}
interface UsageSummary {
	totalCost: number;
	costToday: number;
	costThisWeek: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalCacheReadTokens: number;
	totalCacheWriteTokens: number;
	totalSessions: number;
	daily: DailyUsage[];
	byProject: ProjectUsage[];
}

const { data, refresh } = useLazyFetch<UsageSummary>('/api/usage', { server: false });

onMounted(() => {
	const t = setInterval(refresh, 30_000);
	onUnmounted(() => clearInterval(t));
});

// ── Range filter ──────────────────────────────────────────
const rangeOptions = [
	{ value: 'today',     label: 'Today' },
	{ value: 'yesterday', label: 'Yesterday' },
	{ value: 'last7',     label: 'Last 7 days' },
	{ value: 'last14',    label: 'Last 14 days' },
	{ value: 'last28',    label: 'Last 28 days' },
	{ value: 'last30',    label: 'Last 30 days' },
	{ value: 'alltime',   label: 'All time' },
];
const selectedRange = ref('last7');

function rangeLabel(v: string) {
	return rangeOptions.find(o => o.value === v)?.label ?? v;
}

const todayKey = new Date().toISOString().slice(0, 10);
const yesterdayKey = (() => {
	const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
})();

const filteredDays = computed<DailyUsage[]>(() => {
	const all = data.value?.daily ?? [];
	switch (selectedRange.value) {
		case 'today':     return all.filter(d => d.date === todayKey);
		case 'yesterday': return all.filter(d => d.date === yesterdayKey);
		case 'last7':     return all.slice(-7);
		case 'last14':    return all.slice(-14);
		case 'last28':    return all.slice(-28);
		case 'alltime':   return all;
		default:          return all;
	}
});

const filteredStats = computed(() => {
	const days = filteredDays.value;
	return {
		cost:         days.reduce((s, d) => s + d.cost, 0),
		inputTokens:  days.reduce((s, d) => s + d.inputTokens, 0),
		outputTokens: days.reduce((s, d) => s + d.outputTokens, 0),
		sessions:     days.reduce((s, d) => s + d.sessions, 0),
	};
});

// ── Chart ─────────────────────────────────────────────────
const chartDays = computed(() => {
	const days = filteredDays.value;
	// For single-day ranges just show that day; otherwise cap at 14 bars
	return days.length <= 1 ? days : days.slice(-14);
});

const maxDailyCost = computed(() =>
	Math.max(...chartDays.value.map((d) => d.cost), 0.0001),
);

function barHeight(cost: number) {
	return Math.max((cost / maxDailyCost.value) * 100, cost > 0 ? 4 : 0);
}

function fmtDate(dateStr: string) {
	const d = new Date(dateStr + 'T00:00:00');
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Project list (always all-time from server) ────────────
const maxProjectCost = computed(() =>
	Math.max(...(data.value?.byProject.map((p) => p.cost) ?? [0]), 0.0001),
);

// ── Helpers ───────────────────────────────────────────────
function fmt(n: number) {
	return n.toFixed(4);
}
function fmtTokens(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

function tokenPct(key: 'input' | 'output') {
	const s = filteredStats.value;
	const total = s.inputTokens + s.outputTokens;
	if (total === 0) return 0;
	return ((key === 'input' ? s.inputTokens : s.outputTokens) / total) * 100;
}
</script>

<template>
	<div class="page">
		<div class="page-header">
			<div>
				<h1 class="page-title">Usage</h1>
				<p class="page-subtitle">Estimated API cost and token usage across all Claude Code sessions</p>
			</div>
			<UiDropdown v-model="selectedRange" :options="rangeOptions" />
		</div>

		<!-- ── Top stats ── -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-value">${{ fmt(data?.totalCost ?? 0) }}</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--green)"></span>
					Total Cost
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-value">${{ fmt(filteredStats.cost) }}</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--accent)"></span>
					{{ rangeLabel(selectedRange) }} Cost
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-value">{{ fmtTokens(filteredStats.inputTokens + filteredStats.outputTokens) }}</div>
				<div class="stat-label">
					<span class="stat-dot" style="background: var(--blue)"></span>
					Total Tokens
				</div>
			</div>
		</div>

		<!-- ── Daily cost chart ── -->
		<div class="section">
			<div class="section-title">Daily Cost — {{ rangeLabel(selectedRange) }}</div>
			<div class="chart-card">
				<div class="bar-chart">
					<div v-for="day in chartDays" :key="day.date" class="bar-col">
						<div class="bar-value" v-if="day.cost > 0">${{ day.cost < 0.001 ? '<0.001' : day.cost.toFixed(3) }}</div>
						<div class="bar-wrap">
							<div
								class="bar"
								:class="{ 'bar-active': day.cost > 0 }"
								:style="{ height: barHeight(day.cost) + '%' }"
							/>
						</div>
						<div class="bar-label">{{ fmtDate(day.date) }}</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ── By project ── -->
		<div class="section" v-if="data?.byProject.length">
			<div class="section-title">Cost by Project</div>
			<div class="project-list">
				<div v-for="proj in data.byProject" :key="proj.project" class="project-row">
					<div class="proj-info">
						<span class="proj-name">{{ proj.project }}</span>
						<span class="proj-sessions">{{ proj.sessions }} session{{ proj.sessions !== 1 ? 's' : '' }}</span>
					</div>
					<div class="proj-bar-wrap">
						<div
							class="proj-bar"
							:style="{ width: ((proj.cost / maxProjectCost) * 100) + '%' }"
						/>
					</div>
					<div class="proj-cost">${{ fmt(proj.cost) }}</div>
				</div>
			</div>
		</div>

		<!-- ── Token breakdown ── -->
		<div class="section">
			<div class="section-title">Token Breakdown — {{ rangeLabel(selectedRange) }}</div>
			<div class="breakdown-card">
				<div class="breakdown-row">
					<span class="breakdown-label">Input tokens</span>
					<div class="breakdown-bar-wrap">
						<div class="breakdown-bar" style="background: var(--blue)" :style="{ width: tokenPct('input') + '%' }" />
					</div>
					<span class="breakdown-val">{{ fmtTokens(filteredStats.inputTokens) }}</span>
				</div>
				<div class="breakdown-row">
					<span class="breakdown-label">Output tokens</span>
					<div class="breakdown-bar-wrap">
						<div class="breakdown-bar" style="background: var(--accent)" :style="{ width: tokenPct('output') + '%' }" />
					</div>
					<span class="breakdown-val">{{ fmtTokens(filteredStats.outputTokens) }}</span>
				</div>
			</div>
		</div>

		<p class="disclaimer">
			* Costs are estimated based on public Anthropic pricing and may differ from your actual bill.
			Cache pricing applied: write $3.75/M, read $0.30/M (Sonnet rates).
		</p>
	</div>
</template>


<style scoped>
/* ── Page header ── */
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
.refresh-hint {
	font-size: 11px;
	color: var(--text-muted);
	padding-top: 6px;
}

/* ── Stats grid ── */
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
.section-title {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
	margin-bottom: 12px;
}

/* ── Bar chart ── */
.chart-card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 20px 20px 16px;
}
.bar-chart {
	display: flex;
	align-items: flex-end;
	gap: 6px;
	height: 120px;
}
.bar-col {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	height: 100%;
	gap: 4px;
}
.bar-value {
	font-size: 9px;
	color: var(--text-muted);
	white-space: nowrap;
	height: 14px;
	display: flex;
	align-items: flex-end;
}
.bar-wrap {
	flex: 1;
	width: 100%;
	display: flex;
	align-items: flex-end;
}
.bar {
	width: 100%;
	background: var(--border);
	border-radius: 3px 3px 0 0;
	min-height: 2px;
	transition: height 0.3s ease;
}
.bar.bar-active {
	background: var(--accent);
}
.bar-label {
	font-size: 9px;
	color: var(--text-muted);
	white-space: nowrap;
	text-align: center;
}

/* ── Project list ── */
.project-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.project-row {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	padding: 12px 16px;
	display: grid;
	grid-template-columns: 200px 1fr 80px;
	align-items: center;
	gap: 14px;
}
.proj-info {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}
.proj-name {
	font-size: 13px;
	font-weight: 500;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.proj-sessions {
	font-size: 11px;
	color: var(--text-muted);
}
.proj-bar-wrap {
	height: 6px;
	background: var(--bg-surface);
	border-radius: 3px;
	overflow: hidden;
}
.proj-bar {
	height: 100%;
	background: var(--accent);
	border-radius: 3px;
	transition: width 0.3s ease;
}
.proj-cost {
	font-size: 13px;
	font-weight: 500;
	color: var(--text-primary);
	text-align: right;
	font-variant-numeric: tabular-nums;
}

/* ── Token breakdown ── */
.breakdown-card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 14px;
}
.breakdown-row {
	display: grid;
	grid-template-columns: 110px 1fr 70px;
	align-items: center;
	gap: 14px;
}
.breakdown-label {
	font-size: 12px;
	color: var(--text-secondary);
}
.breakdown-bar-wrap {
	height: 6px;
	background: var(--bg-surface);
	border-radius: 3px;
	overflow: hidden;
}
.breakdown-bar {
	height: 100%;
	border-radius: 3px;
	transition: width 0.3s ease;
	min-width: 2px;
}
.breakdown-val {
	font-size: 12px;
	color: var(--text-primary);
	font-weight: 500;
	text-align: right;
	font-variant-numeric: tabular-nums;
}

/* ── Disclaimer ── */
.disclaimer {
	font-size: 11px;
	color: var(--text-muted);
	margin-top: 8px;
	line-height: 1.6;
}
</style>
