<script setup lang="ts">
interface Props {
	modelValue: boolean;
	title?: string;
	closeOnOverlayClick?: boolean;
	maxWidth?: string;
	autoHeight?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: false,
	title: '',
	closeOnOverlayClick: true,
	maxWidth: '620px',
	autoHeight: false,
});

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
}>();

const close = () => emit('update:modelValue', false);

const onOverlay = () => {
	if (props.closeOnOverlayClick) close();
};

const onKey = (e: KeyboardEvent) => {
	if (e.key === 'Escape' && props.modelValue) close();
};

watch(
	() => props.modelValue,
	(open) => {
		if (open) {
			document.body.style.overflow = 'hidden';
			window.addEventListener('keydown', onKey);
		} else {
			document.body.style.overflow = '';
			window.removeEventListener('keydown', onKey);
		}
	},
);

onUnmounted(() => {
	document.body.style.overflow = '';
	window.removeEventListener('keydown', onKey);
});
</script>

<template>
	<Teleport to="body">
		<Transition name="modal-fade">
			<div v-if="modelValue" class="modal-overlay" @click="onOverlay">
				<Transition name="modal-slide">
					<div
						v-if="modelValue"
						class="modal-content"
						:style="{ maxWidth: maxWidth, height: autoHeight ? 'auto' : '85vh' }"
						@click.stop
					>
						<div class="modal-header">
							<slot name="title">
								<h2 class="modal-title">{{ title }}</h2>
							</slot>
							<button class="modal-close" @click="close" aria-label="Close">✕</button>
						</div>
						<div class="modal-body">
							<slot />
						</div>
						<div v-if="$slots.footer" class="modal-footer">
							<slot name="footer" />
						</div>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.modal-overlay {
	position: fixed;
	inset: 0;
	background: rgba(1, 44, 50, 0.35);
	backdrop-filter: blur(4px);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
	padding: 20px;
}

.modal-content {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: 20px;
	box-shadow: var(--shadow-lg);
	width: 100%;
	max-height: calc(100vh - 48px);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.modal-title {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary);
	letter-spacing: -0.01em;
}

.modal-body {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.modal-footer {
	padding: 20px;
	/* border-top: 1px solid var(--border); */
	flex-shrink: 0;
}

.modal-close {
	width: 30px;
	height: 30px;
	border-radius: var(--radius-xs);
	background: transparent;
	border: 1px solid var(--border);
	color: var(--text-secondary);
	cursor: pointer;
	font-size: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition:
		background 0.15s,
		color 0.15s;
}
.modal-close:hover {
	background: var(--bg-surface);
	color: var(--text-primary);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
	transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
	opacity: 0;
}

.modal-slide-enter-active {
	transition:
		transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
		opacity 0.25s ease;
}
.modal-slide-leave-active {
	transition:
		transform 0.25s cubic-bezier(0.7, 0, 0.84, 0),
		opacity 0.2s ease;
}
.modal-slide-enter-from,
.modal-slide-leave-to {
	transform: translateY(16px) scale(0.97);
	opacity: 0;
}
</style>
