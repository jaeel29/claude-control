<template>
	<section class="hero">
		<BaseBadge variant="glass" color="teal">Local-first · open source</BaseBadge>
		<h1>
			See everything<br />
			Claude Code does.
		</h1>
		<p class="hero__sub">
			A live dashboard for your Claude Code sessions — running tasks, full conversations, tool
			history, and cost. Open source, self-hosted, one command.
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

@include respond-to('md') {
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

@include respond-to('xs') {
	.hero {
		padding-top: 40px;
	}
	.hero h1 {
		font-size: 30px;
		margin-top: 18px;
	}
	.hero__sub {
		font-size: 15px;
		margin-top: 18px;
	}
	.hero__cmd {
		margin-top: 28px;
	}
}

@include respond-to('xxs') {
	.hero h1 {
		font-size: 27px;
	}
}
</style>
