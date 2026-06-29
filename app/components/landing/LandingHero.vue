<template>
	<section class="hero">
		<BaseBadge variant="glass" color="teal">Runs on your computer · open source</BaseBadge>
		<h1>
			A dashboard for<br />
			your Claude Code.
		</h1>
		<p class="hero__sub">
			See what Claude Code is doing on your computer — live sessions, past chats, and what each run
			costs. Run one command to start, and check it from your phone whenever you are away.
		</p>
		<div class="hero__cmd">
			<LandingInstall />
		</div>
		<div class="hero__ctas">
			<BaseButton to="/overview" variant="primary" radius="rounded">Open the dashboard</BaseButton>
			<BaseButton to="#how" variant="outline" radius="rounded">How it works</BaseButton>
		</div>
		<!-- <p class="hero__note">Works on macOS &amp; Linux · no account · open source</p> -->
	</section>
</template>

<script setup lang="ts">
import BaseBadge from '~/components/ui/BaseBadge.vue';
import BaseButton from '~/components/ui/BaseButton.vue';
</script>

<style scoped lang="scss">
@use '~/assets/css/landing' as *;

.hero {
	@include section;
	padding-top: 64px;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;

	h1 {
		@include headline;
		font-size: 56px;
		margin: 22px 0 0;
	}

	&__sub {
		max-width: 600px;
		margin: 22px 0 0;
		font-size: 18px;
		color: var(--color-text-muted);
		line-height: 1.55;
	}

	&__cmd {
		width: 100%;
		max-width: 480px;
		margin: 36px 0 0;
	}

	&__ctas {
		display: flex;
		gap: 12px;
		margin: 28px 0 0;
	}

	&__note {
		margin: 20px 0 0;
		font-size: 13px;
		color: var(--color-text-subtle);
	}
}

@media (max-width: 760px) {
	.hero h1 {
		font-size: 36px;
	}
	.hero__sub {
		font-size: 16px;
	}
	.hero__ctas {
		flex-direction: column;
		width: 100%;
		max-width: 320px;
		:deep(.btn) {
			width: 100%;
		}
	}
}
</style>
