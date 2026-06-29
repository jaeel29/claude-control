<template>
	<section id="how" class="how">
		<BaseBadge variant="glass" color="teal">How it works</BaseBadge>
		<h2>Up and running in seconds.</h2>
		<div class="how__steps">
			<div v-for="s in steps" :key="s.n" class="step">
				<div class="step__n">{{ s.n }}</div>
				<h4>{{ s.title }}</h4>
				<p>{{ s.body }}</p>
			</div>
		</div>

		<div class="how__cmd">
			<p class="how__cmd-label">That's the whole setup — one command:</p>
			<LandingCommandBlock command="npx claudecontrolai" label="your terminal" />
		</div>
	</section>
</template>

<script setup lang="ts">
import BaseBadge from '~/components/ui/BaseBadge.vue';

const steps = [
	{
		n: '1',
		title: 'Run one command',
		body: 'Paste npx claudecontrolai into your terminal. No install, no sign-up — it just starts.',
	},
	{
		n: '2',
		title: 'Open the dashboard',
		body: 'It opens in your browser, already showing your live sessions, history, and costs.',
	},
	{
		n: '3',
		title: 'Everything stays local',
		body: 'It reads the data Claude Code already saved on your machine. No cloud, no account — nothing leaves your computer.',
	},
];
</script>

<style scoped lang="scss">
@use '~/assets/css/landing' as *;

.how {
	@include section;
	@include centered-badge;
	text-align: center;

	h2 {
		@include headline;
		font-size: 38px;
		margin: 18px 0 0;
	}

	&__steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		margin: 48px 0 0;
		text-align: left;
	}

	&__cmd {
		margin: 44px auto 0;
		max-width: 520px;

		&-label {
			color: var(--color-text-muted);
			font-size: 14px;
			margin: 0 0 14px;
		}
	}
}

.step {
	@include glass-card;
	padding: 26px;
	border-radius: 16px;

	&__n {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--badge-teal-glass-bg);
		color: var(--badge-teal-glass-text);
		font-weight: 600;
		margin-bottom: 16px;
	}

	h4 {
		@include headline;
		font-size: 17px;
		margin: 0 0 8px;
	}

	p {
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.55;
	}
}

@include respond-to('md') {
	.how h2 {
		font-size: 28px;
	}
	.how__steps {
		grid-template-columns: 1fr;
		margin-top: 36px;
	}
}

@include respond-to('xs') {
	.how h2 {
		font-size: 24px;
	}
	.step {
		padding: 22px;
	}
}
</style>
