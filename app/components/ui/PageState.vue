<template>
	<!-- Error -->
	<div v-if="error" class="pstate pstate--error">
		<Icon name="lucide:alert-triangle" size="26" mode="svg" />
		<p class="pstate__title">Couldn't load this page</p>
		<p class="pstate__msg">{{ errorMessage }}</p>
		<button v-if="onRetry" class="pstate__retry" type="button" @click="onRetry">
			<Icon name="lucide:refresh-cw" size="14" mode="svg" />
			Retry
		</button>
	</div>

	<!-- Skeleton (first load only) -->
	<div v-else-if="showSkeleton" class="pstate pstate--skeleton">
		<div v-for="n in rows" :key="n" class="pstate__skel-card" :style="{ animationDelay: n * 60 + 'ms' }" />
	</div>

	<!-- Empty -->
	<div v-else-if="empty" class="pstate pstate--empty">
		<Icon :name="emptyIcon" size="30" mode="svg" />
		<p>{{ emptyText }}</p>
	</div>

	<!-- Loaded content -->
	<slot v-else />
</template>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		/** AsyncData `pending` (or any loading boolean). */
		pending?: boolean;
		/** Whether data has arrived yet — skeleton shows only when pending AND no data. */
		hasData?: boolean;
		/** AsyncData `error` (or any truthy error). */
		error?: unknown;
		/** True when loaded but the result is empty. */
		empty?: boolean;
		emptyText?: string;
		emptyIcon?: string;
		/** Number of skeleton placeholder cards. */
		rows?: number;
		/** Optional retry handler (shown on the error state). */
		onRetry?: () => void;
	}>(),
	{
		pending: false,
		hasData: false,
		error: null,
		empty: false,
		emptyText: 'Nothing here yet',
		emptyIcon: 'lucide:inbox',
		rows: 5,
	},
);

// Skeleton only on the first load — never flash it during background refreshes.
const showSkeleton = computed(() => props.pending && !props.hasData);

const errorMessage = computed(() => {
	const e = props.error as any;
	return e?.message || e?.data?.message || 'Something went wrong. Please try again.';
});
</script>

<style scoped lang="scss">
.pstate {
	&--skeleton {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	&__skel-card {
		height: 76px;
		border-radius: var(--radius, 12px);
		background: var(--bg-card, var(--color-surface));
		border: 1px solid var(--border, var(--color-border));
		animation: pstate-shimmer 1.3s ease-in-out infinite;
	}

	&--empty,
	&--error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 8px;
		padding: 72px 20px;
		color: var(--text-muted, var(--color-text-muted));
		font-size: 13px;
	}

	&--error {
		color: var(--red, #ef4444);
	}

	&__title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary, var(--color-text));
		margin: 4px 0 0;
	}

	&__msg {
		color: var(--text-muted, var(--color-text-muted));
		max-width: 360px;
	}

	&__retry {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		padding: 8px 14px;
		border-radius: 8px;
		border: 1px solid var(--border, var(--color-border));
		background: var(--bg-card, var(--color-surface));
		color: var(--text-primary, var(--color-text));
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.12s;

		&:hover {
			background: var(--bg-surface, var(--color-surface-muted));
		}
	}
}

@keyframes pstate-shimmer {
	0%,
	100% {
		opacity: 0.55;
	}
	50% {
		opacity: 1;
	}
}
</style>
