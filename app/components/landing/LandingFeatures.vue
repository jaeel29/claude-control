<template>
	<section id="features" class="features">
		<div v-for="f in features" :key="f.title" class="feature">
			<div class="feature__head">
				<div class="feature__icon" :class="`feature__icon--${f.color}`">
					<Icon :name="f.icon" size="20" mode="svg" />
				</div>
				<BaseBadge variant="glass" :color="f.color">{{ f.label }}</BaseBadge>
			</div>
			<h3>{{ f.title }}</h3>
			<p>{{ f.body }}</p>
		</div>
	</section>
</template>

<script setup lang="ts">
import BaseBadge from '~/components/ui/BaseBadge.vue';

type BadgeColor = 'teal' | 'green' | 'blue' | 'purple';

const features: { label: string; color: BadgeColor; icon: string; title: string; body: string }[] = [
	{
		label: 'Live activity',
		color: 'teal',
		icon: 'lucide:activity',
		title: 'Watch Claude work, live.',
		body: 'See which sessions are running right now, read the full conversation, and follow every step Claude takes — the questions, the tool calls, the files it changes.',
	},
	{
		label: 'Cost tracking',
		color: 'green',
		icon: 'lucide:dollar-sign',
		title: 'See exactly what you spend.',
		body: 'How many tokens each session used and what it cost you, broken down by day, project, and model. Know your bill before it arrives.',
	},
	{
		label: 'Start & stop',
		color: 'blue',
		icon: 'lucide:play',
		title: 'Run Claude from the dashboard.',
		body: 'Start a new task, pick up where an old session left off, or stop a run that is going the wrong way — all with a click, no terminal needed.',
	},
	{
		label: 'On your phone',
		color: 'purple',
		icon: 'lucide:smartphone',
		title: 'Check in from anywhere.',
		body: 'Open the same dashboard on your phone over your private Tailscale network — watch a long run finish even when you are away from your computer.',
	},
];
</script>

<style scoped lang="scss">
@use '~/assets/css/landing' as *;

.features {
	@include section;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20px;
}

.feature {
	@include glass-card;
	padding: 28px;
	border-radius: 16px;

	/* Icon + badge header row */
	&__head {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 18px;
	}

	&__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 42px;
		height: 42px;
		border-radius: 11px;
		flex-shrink: 0;
		&--teal {
			color: var(--badge-teal-glass-text);
			background: var(--badge-teal-glass-bg);
		}
		&--green {
			color: var(--badge-green-glass-text);
			background: var(--badge-green-glass-bg);
		}
		&--blue {
			color: var(--badge-blue-glass-text);
			background: var(--badge-blue-glass-bg);
		}
		&--purple {
			color: var(--badge-purple-glass-text);
			background: var(--badge-purple-glass-bg);
		}
	}

	h3 {
		@include headline;
		font-size: 21px;
		margin: 0 0 10px;
	}

	p {
		color: var(--color-text-muted);
		font-size: 15px;
		line-height: 1.6;
	}
}

@include respond-to('md') {
	.features {
		grid-template-columns: 1fr;
	}
}

@include respond-to('xs') {
	.feature {
		padding: 22px;
	}
	.feature h3 {
		font-size: 19px;
	}
}
</style>
