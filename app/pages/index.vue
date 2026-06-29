<template>
	<div class="lp">
		<LandingNav />
		<LandingHero />
		<LandingStatement />
		<LandingFeatures />
		<LandingHowItWorks />
		<LandingSecurity />
		<LandingFaq />
		<LandingCta />
		<LandingFooter />
	</div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' });
useHead({
	title: 'claude-control — see what Claude Code is doing, from anywhere',
	meta: [
		{
			name: 'description',
			content:
				'A local dashboard for your Claude Code sessions. Run one command and watch live activity, history, and cost — right in your browser.',
		},
	],
});
</script>

<style scoped lang="scss">
.lp {
	min-height: 100vh;
	background: var(--color-bg);
	color: var(--color-text);
	font-family: 'Inter', sans-serif;
}
</style>
