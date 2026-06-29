<template>
	<section class="security">
		<BaseBadge variant="glass" color="yellow">Local-first</BaseBadge>
		<h2>Yours alone, by design.</h2>
		<div class="security__grid">
			<div v-for="item in items" :key="item.title" class="sec">
				<Icon :name="item.icon" size="18" mode="svg" />
				<h4>{{ item.title }}</h4>
				<p>{{ item.body }}</p>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import BaseBadge from '~/components/ui/BaseBadge.vue';

const items = [
	{
		icon: 'lucide:hard-drive',
		title: 'Runs on your machine',
		body: 'A small local server reads the session files Claude Code already saved. There is no backend to phone home to.',
	},
	{
		icon: 'lucide:cloud-off',
		title: 'No cloud, no account',
		body: 'Nothing is uploaded and there is nothing to sign up for. Your conversations never leave your computer.',
	},
	{
		icon: 'lucide:github',
		title: 'Open source',
		body: 'Every line is on GitHub — read it, audit it, or run your own build.',
	},
];
</script>

<style scoped lang="scss">
@use '~/assets/css/landing' as *;

.security {
	@include section;
	@include centered-badge;
	text-align: center;

	h2 {
		@include headline;
		font-size: 38px;
		margin: 18px 0 0;
	}

	&__grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		margin: 44px 0 0;
		text-align: left;
	}
}

.sec {
	@include glass-card;
	padding: 24px;
	border-radius: 14px;
	color: var(--badge-yellow-glass-text);

	h4 {
		color: var(--color-text);
		font-size: 16px;
		font-weight: 600;
		margin: 14px 0 8px;
	}

	p {
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.55;
	}
}

@include respond-to('md') {
	.security h2 {
		font-size: 28px;
	}
	.security__grid {
		grid-template-columns: 1fr;
		margin-top: 32px;
	}
}

@include respond-to('xs') {
	.security h2 {
		font-size: 24px;
	}
}
</style>
