<template>
	<footer class="footer">
		<div class="footer__left">
			<div class="footer__brand">
				<Icon name="icons:logo" size="20" mode="svg" />
				<span>claude-control</span>
			</div>
			<p>Local-first dashboard for Claude Code. Open source.</p>
		</div>
		<a class="footer__gh" :href="repoUrl" target="_blank" rel="noopener">
			<Icon name="lucide:github" size="16" mode="svg" />
			<span>View on GitHub</span>
		</a>
	</footer>
</template>

<script setup lang="ts">
const { repoUrl } = useSite();
</script>

<style scoped lang="scss">
.footer {
	max-width: 1100px;
	margin: 0 auto;
	padding: 40px 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
	flex-wrap: wrap;

	&__left {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	&__brand {
		display: flex;
		align-items: center;
		gap: 9px;
		font-weight: 600;
		font-size: 15px;
		color: var(--color-text);
	}

	p {
		color: var(--color-text-muted);
		font-size: 14px;
	}

	&__gh {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 14px;
		color: var(--color-text-muted);
		text-decoration: none;
		padding: 8px 14px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		transition: all 0.15s;
		&:hover {
			color: var(--color-text);
			background: var(--color-surface-muted);
		}
	}
}

@include respond-to('xs') {
	.footer {
		flex-direction: column;
		align-items: flex-start;
		gap: 24px;
		padding: 32px 16px;
	}
}
</style>
