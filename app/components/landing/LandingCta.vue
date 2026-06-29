<template>
	<section class="cta">
		<BaseBadge variant="glass" color="teal">Get started</BaseBadge>
		<h2>One command. That's it.</h2>
		<p class="cta__sub">Paste this into your terminal and your dashboard opens.</p>
		<div class="cta__cmd">
			<LandingCommandBlock command="npx claudecontrolai" label="your terminal" />
		</div>
		<BaseButton to="/overview" variant="primary" size="lg" radius="rounded">Open the dashboard</BaseButton>
	</section>
</template>

<script setup lang="ts">
import BaseBadge from '~/components/ui/BaseBadge.vue';
import BaseButton from '~/components/ui/BaseButton.vue';
</script>

<style scoped lang="scss">
@use '~/assets/css/landing' as *;

.cta {
	@include section;
	@include centered-badge;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;

	h2 {
		@include headline;
		font-size: 40px;
		margin: 18px 0 0;
	}

	&__sub {
		color: var(--color-text-muted);
		font-size: 16px;
		margin: 14px 0 0;
	}

	&__cmd {
		width: 100%;
		max-width: 480px;
		margin: 36px 0 0;
	}

	:deep(.btn) {
		margin-top: 28px;
	}
}

@include respond-to('md') {
	.cta h2 {
		font-size: 28px;
	}
}

@include respond-to('xs') {
	.cta h2 {
		font-size: 24px;
	}
	.cta :deep(.btn) {
		width: 100%;
	}
}
</style>
