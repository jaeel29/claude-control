<template>
	<div class="cmd">
		<div class="cmd__bar">
			<span class="cmd__dot" />
			<span class="cmd__dot" />
			<span class="cmd__dot" />
			<span v-if="label" class="cmd__title">{{ label }}</span>
		</div>
		<div class="cmd__body">
			<code><span class="cmd__prompt">$</span> {{ command }}</code>
			<button class="cmd__copy" type="button" @click="copy">
				<Icon :name="copied ? 'lucide:check' : 'lucide:copy'" size="15" mode="svg" />
				<span>{{ copied ? 'Copied' : 'Copy' }}</span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{ command: string; label?: string }>();

const copied = ref(false);
async function copy() {
	try {
		await navigator.clipboard.writeText(props.command);
		copied.value = true;
		setTimeout(() => (copied.value = false), 1500);
	} catch {
		/* clipboard may be blocked; ignore */
	}
}
</script>

<style scoped lang="scss">
/* Terminal block keeps a dark surface in BOTH themes (a terminal is dark),
   so colors are intentionally fixed rather than token-driven. */
.cmd {
	width: 100%;
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 12px;
	background: #141414;
	overflow: hidden;
	text-align: left;
	box-shadow: var(--shadow-card);

	&__bar {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 10px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(255, 255, 255, 0.02);
	}

	&__dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.16);
	}

	&__title {
		margin-left: 8px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.4);
	}

	&__body {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px 18px;

		code {
			font-family: 'SF Mono', ui-monospace, Menlo, monospace;
			font-size: 14px;
			color: #ededed;
			white-space: nowrap;
			overflow-x: auto;
		}
	}

	&__prompt {
		color: #00d4ae;
		margin-right: 8px;
		user-select: none;
	}

	&__copy {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		padding: 6px 12px;
		border-radius: 7px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.75);
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: rgba(255, 255, 255, 0.09);
			color: #fff;
		}
	}
}

@include respond-to('xs') {
	.cmd__body {
		gap: 10px;
		padding: 14px 14px;

		code {
			font-size: 13px;
		}
	}
	.cmd__copy {
		padding: 6px 10px;
		font-size: 12px;
	}
}
</style>
