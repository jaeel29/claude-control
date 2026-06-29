<template>
	<div class="install">
		<div class="install__tabs" role="tablist">
			<button
				v-for="t in tabs"
				:key="t.key"
				class="install__tab"
				:class="{ 'install__tab--active': active === t.key }"
				type="button"
				role="tab"
				:aria-selected="active === t.key"
				@click="active = t.key"
			>
				<Icon :name="t.key === 'npm' ? 'lucide:terminal' : 'ai:claude'" size="15" mode="svg" />
				<span>{{ t.label }}</span>
			</button>
		</div>

		<LandingCommandBlock :command="current.command" :label="current.cmdLabel" />
		<p class="install__hint">{{ current.hint }}</p>
	</div>
</template>

<script setup lang="ts">
type TabKey = 'npm' | 'claude';

const tabs: { key: TabKey; label: string }[] = [
	{ key: 'npm', label: 'npm' },
	{ key: 'claude', label: 'Claude' },
];

const options: Record<TabKey, { command: string; cmdLabel: string; hint: string }> = {
	npm: {
		command: 'npx claude-control',
		cmdLabel: 'your terminal',
		hint: 'Run it in your terminal — needs Node 20+. The dashboard opens at localhost:3001.',
	},
	claude: {
		command: 'Install and run claude-control',
		cmdLabel: 'ask Claude Code',
		hint: 'Not comfortable with the terminal? Paste this into Claude Code and it sets everything up for you.',
	},
};

const active = ref<TabKey>('npm');
const current = computed(() => options[active.value]);
</script>

<style scoped lang="scss">
.install {
	width: 100%;

	&__tabs {
		display: inline-flex;
		gap: 4px;
		padding: 4px;
		margin: 0 0 14px;
		border-radius: 10px;
		background: var(--color-surface-muted);
		border: 1px solid var(--color-border);
	}

	&__tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border: none;
		border-radius: 7px;
		background: transparent;
		color: var(--color-text-muted);
		font-size: 13px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s ease;

		&--active {
			background: var(--color-surface);
			color: var(--color-text);
			box-shadow: var(--shadow-card);
		}
	}

	&__hint {
		margin: 14px 0 0;
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
}
</style>
