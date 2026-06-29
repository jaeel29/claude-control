<template>
	<section class="security">
		<BaseBadge variant="glass" color="yellow">Built for trust</BaseBadge>
		<h2>Remote, without the risk.</h2>
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
		icon: 'lucide:lock',
		title: 'Token-protected',
		body: 'Every remote request needs an access token, generated on first run.',
	},
	{
		icon: 'lucide:shield',
		title: 'Private network',
		body: 'With Tailscale, the dashboard is only reachable on your own devices.',
	},
	{
		icon: 'lucide:eye',
		title: 'View-only by default',
		body: 'Watching is free; running code remotely is opt-in with one flag.',
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
