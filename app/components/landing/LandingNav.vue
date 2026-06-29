<template>
	<header class="nav">
		<nav class="nav__links">
			<NuxtLink to="#features">Features</NuxtLink>
			<NuxtLink to="#how">How it works</NuxtLink>
			<NuxtLink to="#faq">FAQ</NuxtLink>
		</nav>

		<div class="nav__brand">
			<Icon name="icons:logo" size="22" mode="svg" />
			<span>Claude Control</span>
		</div>

		<div class="nav__actions">
			<a class="nav__gh" :href="repoUrl" target="_blank" rel="noopener" aria-label="GitHub repository">
				<Icon name="lucide:github" size="18" mode="svg" />
			</a>
			<BaseButton
				class="nav__theme"
				variant="neutral"
				size="sm"
				radius="rounded"
				:aria-label="`Theme: ${selectedTheme} (click to change)`"
				:title="`Theme: ${selectedTheme}`"
				@click="toggleTheme"
			>
				<template #icon-left>
					<Icon :name="themeIcon" size="17" mode="svg" />
				</template>
			</BaseButton>
		</div>
	</header>
</template>

<script setup lang="ts">
import BaseButton from '~/components/ui/BaseButton.vue';

const { selectedTheme, toggleTheme } = useTheme();
const { repoUrl } = useSite();

// Icon reflects the chosen preference (light / dark / system) so all three
// states are distinguishable — system has its own icon, not a sun/moon.
const themeIcon = computed(() => {
	if (selectedTheme.value === 'light') return 'icons:theme-light';
	if (selectedTheme.value === 'dark') return 'icons:theme-dark';
	return 'icons:theme-system';
});
</script>

<style scoped lang="scss">
.nav {
	position: relative;
	max-width: 1100px;
	margin: 0 auto;
	padding: 20px 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;

	/* Brand centered — absolutely centered so it stays mid-nav
	   regardless of the links / actions widths */
	&__brand {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		gap: 9px;
		font-weight: 600;
		font-size: 15px;
		color: var(--color-text);
	}

	/* Links on the left, normal flow */
	&__links {
		display: flex;
		align-items: center;
		gap: 26px;
		a {
			color: var(--color-text-muted);
			text-decoration: none;
			font-size: 14px;
			transition: color 0.15s;
			&:hover {
				color: var(--color-text);
			}
		}
	}

	&__actions {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	&__gh {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		transition: color 0.15s;
		&:hover {
			color: var(--color-text);
		}
	}

	/* Icon-only square: collapse BaseButton padding/gap to a 34px square */
	&__theme {
		width: 34px;
		padding: 0 !important;
		color: var(--color-text-muted);
		:deep(.btn__icon) {
			margin: 0;
		}
		&:hover {
			color: var(--color-text);
		}
	}
}

@include respond-to('md') {
	/* Hide center links on mobile; keep brand + actions */
	.nav__links {
		display: none;
	}

	/* With links gone, push brand to the natural left so it isn't overlapped
	   by the actions on the right at narrow widths. */
	.nav__brand {
		position: static;
		transform: none;
	}

	.nav {
		justify-content: space-between;
	}
}

@include respond-to('xxs') {
	.nav {
		padding: 16px 16px;
	}
	.nav__brand {
		font-size: 14px;
		gap: 7px;
	}
	.nav__actions {
		gap: 10px;
	}
}
</style>
