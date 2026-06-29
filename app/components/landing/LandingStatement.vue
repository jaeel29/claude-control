<template>
	<section class="statement">
		<h2>Everything Claude Code does,<br />in one clear view.</h2>
		<p>
			Claude Code already saves your sessions to your computer. claude-control reads them and turns
			them into a live dashboard — so nothing is hidden in the terminal, and nothing leaves your machine.
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

@media (max-width: 760px) {
	.statement h2 {
		font-size: 28px;
	}
}
</style>
