<template>
	<span :class="classes">
		<span v-if="dot" class="badge-dot" :class="{ 'badge-dot--pulse': pulse }" />
		<slot name="icon-left" />
		<slot />
		<slot name="icon-right" />
	</span>
</template>

<script setup lang="ts">
interface Props {
	color?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'purple' | 'teal' | 'pink' | 'outline'
	size?: 'sm' | 'md'
	dot?: boolean
	pulse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	color: 'gray',
	size: 'md',
	dot: false,
	pulse: false,
})

const classes = computed(() => [
	'badge',
	`badge--${props.color}`,
	`badge--${props.size}`,
])
</script>

<style scoped lang="scss">
.badge {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	border-radius: 20px;
	font-weight: 500;
	white-space: nowrap;
	line-height: 1;
	border: 1px solid transparent;

	&--sm {
		padding: 2px 8px;
		font-size: 11px;
	}

	&--md {
		padding: 4px 10px;
		font-size: 12px;
	}

	// ── Colors ──────────────────────────────────────────────
	&--gray {
		background: #f3f4f6;
		color: #4b5563;
		border-color: #e5e7eb;
	}

	&--blue {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
		border-color: rgba(59, 130, 246, 0.2);
	}

	&--green {
		background: rgba(16, 185, 129, 0.1);
		color: #059669;
		border-color: rgba(16, 185, 129, 0.2);
	}

	&--yellow {
		background: rgba(245, 158, 11, 0.1);
		color: #d97706;
		border-color: rgba(245, 158, 11, 0.2);
	}

	&--red {
		background: rgba(239, 68, 68, 0.08);
		color: #dc2626;
		border-color: rgba(239, 68, 68, 0.18);
	}

	&--orange {
		background: rgba(249, 115, 22, 0.1);
		color: #ea580c;
		border-color: rgba(249, 115, 22, 0.2);
	}

	&--purple {
		background: rgba(139, 92, 246, 0.1);
		color: #7c3aed;
		border-color: rgba(139, 92, 246, 0.2);
	}

	&--teal {
		background: rgba(0, 182, 149, 0.08);
		color: #00b695;
		border-color: rgba(0, 182, 149, 0.22);
	}

	&--pink {
		background: rgba(236, 72, 153, 0.08);
		color: #db2777;
		border-color: rgba(236, 72, 153, 0.18);
	}

	&--outline {
		background: transparent;
		color: #6b7280;
		border-color: #d1d5db;
	}
}

// ── Dot indicator ──────────────────────────────────────────
.badge-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	flex-shrink: 0;

	&--pulse {
		animation: pulse 1.5s ease-in-out infinite;
	}
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50%       { opacity: 0.35; }
}
</style>
