<script setup lang="ts">
// Jaber page component
</script>

<template>
	<div class="page">
		<div class="page-header">
			<h1 class="page-title">Jaber</h1>
			<p class="page-subtitle">User profile and settings</p>
		</div>

		<div class="card">
			<div class="empty">
				<Icon name="lucide:user" size="28" style="opacity: 0.3; display: block; margin: 0 auto 10px" />
				Jaber page content coming soon
			</div>
		</div>
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

/* ── Card ── */
.card {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	box-shadow: var(--shadow-sm);
}

/* ── Empty ── */
.empty {
	text-align: center;
	padding: 52px 20px;
	color: var(--text-muted);
	font-size: 13px;
}
</style>
