<template>
	<div class="app-shell" :class="{ 'app-shell--sidebar-open': open }">
		<!-- Mobile top bar with hamburger (≤ md) -->
		<div class="mobile-bar">
			<button class="mobile-bar__btn" type="button" aria-label="Open menu" @click="openSidebar">
				<Icon name="lucide:menu" size="20" mode="svg" />
			</button>
			<div class="mobile-bar__brand">
				<Icon name="icons:logo" size="20" mode="svg" />
				<span>Claude Control</span>
			</div>
		</div>

		<!-- Backdrop behind the off-canvas sidebar -->
		<div v-if="open" class="sidebar-backdrop" @click="closeSidebar" />

		<AppSidebar />
		<main class="main">
			<slot />
		</main>
		<ChatWidget />
	</div>
</template>

<script setup lang="ts">
const route = useRoute();
const { open, openSidebar, closeSidebar } = useSidebar();

// Close the mobile sidebar whenever the route changes.
watch(() => route.path, () => closeSidebar());

// Lock the outer page to the viewport while the dashboard is mounted — only the
// inner panels (.main, the chat widget) scroll. Auto-removed when this layout
// unmounts (e.g. navigating to the landing page, which DOES scroll).
useHead({ htmlAttrs: { class: 'dash-locked' } });
</script>

<style scoped lang="scss">
/* Mobile top bar — only shown ≤ md; hidden on desktop */
.mobile-bar {
	display: none;
	align-items: center;
	gap: 12px;
	height: 52px;
	padding: 0 14px;
	background: var(--bg-sidebar);
	border: 1px solid var(--sidebar-border);
	border-radius: 16px;
	position: sticky;
	top: 0;
	z-index: 30;

	&__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;

		&:hover {
			background: var(--sidebar-hover);
		}
	}

	&__brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	@include respond-to('md') {
		display: flex;
	}
}

.sidebar-backdrop {
	display: none;

	@include respond-to('md') {
		display: block;
		position: fixed;
		inset: 0;
		z-index: 39;
		background: rgba(0, 0, 0, 0.45);
	}
}

/* On mobile the shell stacks: top bar spans the top, main fills the rest.
   The sidebar becomes an off-canvas drawer (positioned in AppSidebar.vue). */
@include respond-to('md') {
	.app-shell {
		flex-direction: column;
	}
}
</style>
