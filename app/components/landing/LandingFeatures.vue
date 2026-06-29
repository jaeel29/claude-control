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
		title: 'Watch every move, live.',
		body: 'Running sessions, the full conversation, and each tool call and file edit as they happen — streamed straight from your local session logs.',
	},
	{
		label: 'Cost tracking',
		color: 'green',
		icon: 'lucide:dollar-sign',
		title: 'Know what it costs.',
		body: 'Tokens and estimated cost per session, broken down by day, project, and model — so the bill is never a surprise.',
	},
	{
		label: 'Start & stop',
		color: 'blue',
		icon: 'lucide:play',
		title: 'Drive it from the dashboard.',
		body: 'Kick off a task, resume an old session, or stop a run that went sideways — one click, no terminal required.',
	},
	{
		label: 'History',
		color: 'purple',
		icon: 'lucide:history',
		title: 'Nothing scrolls away.',
		body: 'Every past session is kept and searchable — full transcripts, tool calls, and the files each run touched, long after the terminal is gone.',
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
