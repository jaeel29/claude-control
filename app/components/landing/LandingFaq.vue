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
		q: 'What is claudecontrolai, in one sentence?',
		a: 'It is a simple dashboard that shows you everything Claude Code is doing on your computer — live sessions, past conversations, and how much each run costs.',
	},
	{
		q: 'How do I run it?',
		a: 'Run npx claudecontrolai in your terminal and open the dashboard in your browser. Nothing to install, no sign-up.',
	},
	{
		q: 'Where does my data go?',
		a: 'Nowhere. Everything runs on your own computer and reads files Claude Code already saved there. There is no cloud, no account, and nothing is ever uploaded.',
	},
	{
		q: 'Can I run Claude from the dashboard?',
		a: 'Yes. You can start a new task, resume a past session, or stop a run — straight from the dashboard, no terminal needed.',
	},
	{
		q: 'How do I open it on my phone?',
		a: 'Install Tailscale (free) on your computer and phone, then run: npx claudecontrolai --bind tailnet. It prints a private link and an access token — open the link on your phone and enter the token. Your computer must stay awake. Remote is view-only unless you add --allow-remote-run.',
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

@include respond-to('md') {
	.faq h2 {
		font-size: 28px;
	}
}

@include respond-to('xs') {
	.faq h2 {
		font-size: 24px;
	}
	.faq__trigger {
		padding: 16px 16px;
		gap: 12px;
	}
	.faq__question {
		font-size: 15px;
	}
	.faq__answer {
		padding: 14px 16px;
	}
}
</style>
