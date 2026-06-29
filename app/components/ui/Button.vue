<template>
	<NuxtLink
		v-if="to"
		:to="to"
		:class="buttonClasses"
		:target="target"
		:rel="target === '_blank' ? 'noopener noreferrer' : undefined"
	>
		<slot name="icon-left" />
		<span v-if="$slots.default" :class="textClasses">
			<slot />
		</span>
		<slot name="icon-right" />
	</NuxtLink>

	<button v-else :type="nativeType" :class="buttonClasses" :aria-disabled="disabled" @click="handleClick">
		<slot name="icon-left" />
		<span v-if="$slots.default" :class="textClasses">
			<slot />
		</span>
		<slot name="icon-right" />
	</button>
</template>

<script setup lang="ts">
interface Props {
	variant?: 'primary' | 'neutral' | 'secondary' | 'outline' | 'ghost' | 'blury' | 'neutral-static' | 'always-white' | 'danger';
	size?: 'small' | 'medium' | 'large';
	fullWidth?: boolean;
	to?: string | object;
	target?: '_blank' | '_self' | '_parent' | '_top';
	nativeType?: 'button' | 'submit' | 'reset';
	disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	variant: 'neutral',
	size: 'medium',
	fullWidth: false,
	nativeType: 'button',
	disabled: false,
});

const emit = defineEmits<{
	click: [event: MouseEvent];
}>();

const isShaking = ref(false);

const handleClick = (event: MouseEvent) => {
	if (props.disabled) {
		// Trigger shake animation
		isShaking.value = true;
		setTimeout(() => {
			isShaking.value = false;
		}, 300);
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		return false;
	}
	emit('click', event);
};

const buttonClasses = computed(() => [
	'button',
	`button--${props.variant}`,
	`button--${props.size}`,
	{
		'button--full-width': props.fullWidth,
		'button--disabled': props.disabled,
		'button--shaking': isShaking.value,
	},
]);

const textClasses = computed(() => ['button__text']);
</script>

<style scoped lang="scss">
// @use '@/assets/css/mixins' as *;

.button {
	font-family: 'Inter', sans-serif;
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 6px;
	border-radius: 8px;
	cursor: pointer;
	font-weight: 500;
	border: none;
	outline: none;
	text-decoration: none;
	line-height: 1;

	// @include focus-visible;

	&--full-width {
		width: 100%;
	}

	&__text {
		display: inline-flex;
		align-items: center;
	}

	// Default hover/active fallback (for variants without their own hover, e.g. always-white)
	&:hover:not(.button--disabled) {
		background-color: var(--bg-card-hover);
	}

	&:active:not(.button--disabled) {
		transform: scale(0.98);
	}

	// Sizes
	&--small {
		padding: 4px 10px;
		height: 32px;
		font-size: 13px;
	}

	&--medium {
		padding: 6px 12px;
		height: 36px;
		font-size: 14px;
	}

	&--large {
		padding: 10px 16px;
		height: 40px;
		font-size: 16px;
	}

	// Variants
	&--primary {
		background-color: var(--button-primary-bg);
		color: var(--button-primary-text);
		transition: all 0.1s ease-in-out;

		&:hover:not(.button--disabled) {
			background-color: var(--button-primary-hover);
		}

		&:active:not(.button--disabled) {
			background-color: var(--button-primary-active);
			transform: scale(0.98);
		}

		&.button--disabled {
			background-color: var(--button-primary-disabled-bg);
			color: var(--button-primary-disabled-text);
		}
	}

	&--secondary {
		background-color: var(--button-secondary-bg);
		color: var(--button-secondary-text);
		transition: all 0.1s ease-in-out;

		&:hover:not(.button--disabled) {
			background-color: var(--button-secondary-hover);
		}

		&:active:not(.button--disabled) {
			background-color: var(--button-secondary-active);
			transform: scale(0.98);
		}

		&.button--disabled {
			background-color: var(--button-secondary-disabled-bg);
			color: var(--button-secondary-disabled-text);
		}
	}

	&--neutral {
		background-color: var(--button-neutral-bg);
		color: var(--button-neutral-text);
		// box-shadow: 0 40px 24px rgba(0, 0, 0, 0.059), 0 23px 14px rgba(0, 0, 0, 0.078), 0 10px 10px rgba(0, 0, 0, 0.122),
		// 	0 3px 6px rgba(0, 0, 0, 0.188);
		transition: all 0.1s ease-in-out;

		// Dark mode shadow for neutral variant
		// :root[data-theme='dark'] & {
		// 	box-shadow: 0 20px 24px rgba(255, 255, 255, 0.03), 0 15px 14px rgba(255, 255, 255, 0.05),
		// 		0 6px 10px rgba(255, 255, 255, 0.08), 0 3px 6px rgba(255, 255, 255, 0.1);
		// }

		&:hover:not(.button--disabled) {
			background-color: var(--button-neutral-hover);
		}

		&:active:not(.button--disabled) {
			background-color: var(--button-neutral-active);
			transform: scale(0.98);
		}

		&.button--disabled {
			background-color: var(--button-neutral-disabled-bg);
			color: var(--button-neutral-disabled-text);
			box-shadow: none;

			:root[data-theme='dark'] & {
				box-shadow: none;
			}
		}
	}

	&--neutral-static {
		background-color: var(--button-neutral-static-bg);
		color: var(--button-neutral-static-text);
		box-shadow: 0 40px 24px rgba(0, 0, 0, 0.059), 0 23px 14px rgba(0, 0, 0, 0.078), 0 10px 10px rgba(0, 0, 0, 0.122),
			0 3px 6px rgba(0, 0, 0, 0.188);
		transition: all 0.1s ease-in-out;

		&:hover:not(.button--disabled) {
			background-color: var(--button-neutral-static-hover);
		}

		&:active:not(.button--disabled) {
			background-color: var(--button-neutral-static-active);
			transform: scale(0.98);
		}

		&.button--disabled {
			background-color: var(--button-neutral-static-disabled-bg);
			color: var(--button-neutral-static-disabled-text);
		}
	}

	&--outline {
		background-color: var(--button-outline-bg);
		color: var(--button-outline-text);
		border: 1px solid var(--button-outline-border);
		transition: all 0.1s ease-in-out;
		// box-shadow: 0 40px 24px #4646460f, 0 23px 14px #7d7d7d14, 0 10px 10px #a1a1a11f, 0 3px 6px #9f9f9f30;

		&:hover:not(.button--disabled) {
			background-color: var(--button-outline-hover);
			border-color: var(--button-outline-border-hover);
		}

		&:active:not(.button--disabled) {
			background-color: var(--button-outline-active);
			transform: scale(0.98);
		}

		&.button--disabled {
			background-color: var(--button-outline-disabled-bg);
			color: var(--button-outline-disabled-text);
			border-color: var(--button-outline-disabled-border);
		}
	}

	&--ghost {
		background-color: var(--button-ghost-bg);
		color: var(--button-ghost-text);
		transition: all 0.1s ease-in-out;

		&:hover:not(.button--disabled) {
			background-color: var(--button-ghost-hover);
		}

		&:active:not(.button--disabled) {
			background-color: var(--button-ghost-active);
			transform: scale(0.98);
		}

		&.button--disabled {
			background-color: var(--button-ghost-disabled-bg);
			color: var(--button-ghost-disabled-text);
		}
	}

	&--blury {
		background-color: var(--button-blury-bg);
		color: var(--button-blury-text);
		border: 1px solid var(--button-blury-border);
		backdrop-filter: blur(18px);
		transition: all 0.1s ease-in-out;

		&:hover:not(.button--disabled) {
			border-color: rgba(255, 255, 255, 0.8);
			transform: translateY(-1px);
		}

		&:active:not(.button--disabled) {
			transform: translateY(1px) scale(0.98);
		}

		&.button--disabled {
			background-color: var(--button-blury-disabled-bg);
			color: var(--button-blury-disabled-text);
			border-color: var(--button-blury-disabled-border);
		}
	}

	&--always-white {
		background-color: #ffffff;
		color: #000000;
		transition: all 0.1s ease-in-out;
	}

	&--danger {
		background-color: #e53e3e;
		color: #ffffff;
		transition: all 0.1s ease-in-out;

		&:hover:not(.button--disabled) {
			background-color: #d03535;
		}

		&:active:not(.button--disabled) {
			background-color: #b92e2e;
			transform: scale(0.98);
		}
	}

	&--disabled {
		box-shadow: none;
		cursor: not-allowed;
		opacity: 0.6;
		pointer-events: auto; // Allow clicks to be detected for shake animation
	}

	&--shaking {
		animation: shake 0.3s ease-in-out;
	}
}

@keyframes shake {
	0%,
	100% {
		transform: translateX(0);
	}
	10%,
	30%,
	50%,
	70%,
	90% {
		transform: translateX(-3px);
	}
	20%,
	40%,
	60%,
	80% {
		transform: translateX(3px);
	}
}
</style>
