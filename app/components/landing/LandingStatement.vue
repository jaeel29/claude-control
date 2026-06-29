<template>
	<section class="statement">
		<h2>The terminal scrolls away.<br />Your work shouldn't.</h2>
		<p>
			Claude Code already records every session to your computer. claudecontrol turns that into a
			dashboard you can actually read — searchable, always there, and never leaving your machine.
		</p>
	</section>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use '~/assets/css/landing' as *;

.statement {
	@include section;
	text-align: center;

	h2 {
		@include headline;
		font-size: 38px;
	}

	p {
		max-width: 580px;
		margin: 20px auto 0;
		color: var(--color-text-muted);
		font-size: 17px;
		line-height: 1.6;
	}
}

@include respond-to('md') {
	.statement h2 {
		font-size: 28px;
	}
}

@include respond-to('xs') {
	.statement h2 {
		font-size: 24px;
	}
	.statement p {
		font-size: 16px;
	}
}
</style>
