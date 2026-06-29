<template>
	<section id="faq" class="faq">
		<BaseBadge variant="glass" color="teal">FAQ</BaseBadge>
		<h2>Questions, answered.</h2>

		<ul class="faq__list">
			<li
				v-for="(f, i) in faqs"
				:key="f.q"
				class="faq__item"
				:class="{ 'faq__item--open': openFaq === i }"
			>
				<button
					class="faq__trigger"
					:class="{ 'faq__trigger--open': openFaq === i }"
					:aria-expanded="openFaq === i"
					type="button"
					@click="toggle(i)"
				>
					<span class="faq__question">{{ f.q }}</span>
					<span class="faq__icon" aria-hidden="true">
						<Icon :name="openFaq === i ? 'lucide:x' : 'lucide:plus'" :size="16" mode="svg" />
					</span>
				</button>
				<div class="faq__body" :class="{ 'faq__body--visible': openFaq === i }">
					<div class="faq__body-inner">
						<p class="faq__answer">{{ f.a }}</p>
					</div>
				</div>
			</li>
		</ul>
	</section>
</template>

<script setup lang="ts">
import BaseBadge from '~/components/ui/BaseBadge.vue';

const faqs = [
	{
		q: 'What is claude-control, in one sentence?',
		a: 'It is a simple dashboard that shows you everything Claude Code is doing on your computer — live sessions, past conversations, and how much each run costs.',
	},
	{
		q: 'Where does my data go?',
		a: 'Nowhere. Everything runs on your own computer and reads files Claude Code already saved there. There is no cloud, no account, and nothing is ever uploaded.',
	},
	{
		q: 'How do I open it on my phone?',
		a: 'Install Tailscale (free) on your computer and phone, then start it with: npx claude-control --bind tailnet. It prints a link and a password — open the link on your phone and enter the password.',
	},
	{
		q: 'Is the phone view safe?',
		a: 'Yes. It is locked behind a password, and with Tailscale only your own devices can reach it. By default the phone view is look-only — you can watch, but starting or stopping runs from your phone is off unless you turn it on.',
	},
	{
		q: 'Does my computer have to stay on?',
		a: 'Yes. Your data lives on your computer, so it needs to be awake and online for the phone view to work. There is no copy of your data anywhere else.',
	},
	{
		q: 'What do I need to get started?',
		a: 'Node 20 or newer and the Claude Code CLI you already use. For phone access, add Tailscale. That is everything.',
	},
];

const openFaq = ref<number | null>(0);
function toggle(i: number) {
	openFaq.value = openFaq.value === i ? null : i;
}
</script>

<style scoped lang="scss">
@use '~/assets/css/landing' as *;

.faq {
	@include section;
	@include centered-badge;
	text-align: center;

	h2 {
		@include headline;
		font-size: 38px;
		margin: 18px 0 40px;
	}

	&__list {
		list-style: none;
		padding: 0;
		margin: 0 auto;
		width: 100%;
		max-width: 688px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		text-align: left;
	}

	/* Each item is its own bordered card (Diali style) */
	&__item {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		overflow: hidden;
	}

	&__trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		width: 100%;
		padding: 18px 20px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		font-family: inherit;

		&--open {
			border-bottom: 1px solid var(--color-border);
		}
	}

	&__question {
		font-size: 16px;
		font-weight: 500;
		color: var(--color-text);
		line-height: 1.5;
	}

	&__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--color-text-muted);
	}

	/* Answer animates open via grid-template-rows (Diali technique) */
	&__body {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.3s ease;
	}

	&__body--visible {
		grid-template-rows: 1fr;
	}

	&__body-inner {
		overflow: hidden;
	}

	&__answer {
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-text-muted);
		margin: 0;
		padding: 16px 20px;
	}
}

@media (max-width: 760px) {
	.faq h2 {
		font-size: 28px;
	}
}
</style>
