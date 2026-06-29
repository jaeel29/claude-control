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
/* Frosted "glass" badges driven by the --badge-*-glass-* design tokens, so
   light/dark both adapt automatically (mirrors BaseBadge's glass variant). */
@mixin badge-glass($c) {
	background: var(--badge-#{$c}-glass-bg);
	color: var(--badge-#{$c}-glass-text);
	border-color: var(--badge-#{$c}-glass-border);
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	border-radius: 20px;
	font-weight: 500;
	white-space: nowrap;
	line-height: 1;
	border: 1px solid transparent;
	box-shadow: var(--badge-glass-shadow);
	text-shadow: var(--badge-glass-text-shadow);

	&--sm {
		padding: 2px 8px;
		font-size: 11px;
	}

	&--md {
		padding: 4px 10px;
		font-size: 12px;
	}

	// ── Colors (glass tokens) ───────────────────────────────
	&--gray   { @include badge-glass(gray); }
	&--blue   { @include badge-glass(blue); }
	&--green  { @include badge-glass(green); }
	&--yellow { @include badge-glass(yellow); }
	&--red    { @include badge-glass(red); }
	&--orange { @include badge-glass(orange); }
	&--purple { @include badge-glass(purple); }
	&--teal   { @include badge-glass(teal); }
	&--pink   { @include badge-glass(pink); }

	// outline → neutral gray stroke (transparent fill)
	&--outline {
		background: transparent;
		color: var(--badge-gray-stroke-text);
		border-color: var(--badge-gray-stroke-border);
		box-shadow: none;
		text-shadow: none;
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
