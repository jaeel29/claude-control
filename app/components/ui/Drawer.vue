<template>
	<div v-if="$slots.trigger" @click="openDrawer">
		<slot name="trigger" :open="openDrawer" />
	</div>

	<Teleport to="body">
		<Transition name="drawer">
			<div
				v-if="isOpen"
				class="drawer-overlay"
				:class="`drawer-overlay--${position}`"
				:style="{ zIndex: 9999 }"
				@click="handleOverlayClick"
			>
				<div
					ref="drawerContent"
					class="drawer-content"
					:class="`drawer-content--${position}`"
					:style="drawerStyle"
					@click.stop
					@touchstart="handleTouchStart"
					@touchmove="handleTouchMove"
					@touchend="handleTouchEnd"
					@mousedown="handleMouseDown"
				>
					<div class="drawer-header" :class="{ 'drawer-header--with-title': !!title }">
						<div v-if="position === 'bottom'" class="drawer-handle" />
						<h2 v-if="title" class="drawer-title">{{ title }}</h2>
						<button type="button" class="drawer-close" aria-label="Close drawer" @click="closeDrawer">
							<Icon name="lucide:x" mode="svg" size="16" />
						</button>
					</div>

					<div class="drawer-body">
						<slot :close="closeDrawer" />
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
interface Props {
	modelValue?: boolean;
	position?: 'left' | 'right' | 'top' | 'bottom';
	dismissable?: boolean;
	draggable?: boolean;
	title?: string;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: undefined,
	position: 'bottom',
	dismissable: true,
	draggable: true,
	title: undefined,
});

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const internalOpen = ref(false);

const isOpen = computed({
	get: () => (props.modelValue !== undefined ? props.modelValue : internalOpen.value),
	set: (value: boolean) => {
		if (props.modelValue !== undefined) {
			emit('update:modelValue', value);
		} else {
			internalOpen.value = value;
		}
	},
});

const openDrawer = () => {
	isOpen.value = true;
};
const closeDrawer = () => {
	isOpen.value = false;
};
const handleOverlayClick = () => {
	if (props.dismissable) closeDrawer();
};

// Drag-to-dismiss
const drawerContent = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const dragOffset = ref(0);
const startY = ref(0);
const startX = ref(0);
const startTime = ref(0);
const lastY = ref(0);
const lastX = ref(0);
const velocity = ref(0);
const isClosing = ref(false);

const drawerStyle = computed(() => {
	const styles: Record<string, string> = {};
	if ((isDragging.value || isClosing.value) && drawerContent.value) {
		const isVertical = props.position === 'bottom' || props.position === 'top';
		if (isVertical) {
			styles.transform = `translateY(${dragOffset.value}px)`;
		} else {
			styles.transform = `translateX(${dragOffset.value}px)`;
		}
		styles.transition = isClosing.value ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none';
	}
	return styles;
});

const shouldDrag = (): boolean => {
	if (!props.dismissable || !props.draggable || !drawerContent.value) return false;
	const body = drawerContent.value.querySelector('.drawer-body') as HTMLElement;
	if (!body) return true;
	if (props.position === 'bottom') return body.scrollTop === 0;
	if (props.position === 'top') return body.scrollTop >= body.scrollHeight - body.clientHeight;
	if (props.position === 'right') return body.scrollLeft >= body.scrollWidth - body.clientWidth;
	return body.scrollLeft === 0;
};

const handleTouchStart = (e: TouchEvent) => {
	if (!shouldDrag() || !e.touches[0]) return;
	isDragging.value = true;
	startY.value = e.touches[0].clientY;
	startX.value = e.touches[0].clientX;
	lastY.value = startY.value;
	lastX.value = startX.value;
	startTime.value = Date.now();
	dragOffset.value = 0;
};

const handleTouchMove = (e: TouchEvent) => {
	if (!isDragging.value || !e.touches[0]) return;
	const currentY = e.touches[0].clientY;
	const currentX = e.touches[0].clientX;
	const deltaTime = Date.now() - startTime.value;
	const isVertical = props.position === 'bottom' || props.position === 'top';
	if (isVertical) {
		let delta = currentY - startY.value;
		if (props.position === 'bottom' && delta < 0) delta = 0;
		if (props.position === 'top' && delta > 0) delta = 0;
		velocity.value = (currentY - lastY.value) / (deltaTime || 1);
		lastY.value = currentY;
		dragOffset.value = delta;
		if (Math.abs(delta) > 10) e.preventDefault();
	} else {
		let delta = currentX - startX.value;
		if (props.position === 'left' && delta > 0) delta = 0;
		if (props.position === 'right' && delta < 0) delta = 0;
		velocity.value = (currentX - lastX.value) / (deltaTime || 1);
		lastX.value = currentX;
		dragOffset.value = delta;
		if (Math.abs(delta) > 10) e.preventDefault();
	}
};

const finishDrag = () => {
	if (!isDragging.value) return;
	const threshold = 100;
	const velocityThreshold = 0.5;
	const shouldClose = Math.abs(dragOffset.value) > threshold || Math.abs(velocity.value) > velocityThreshold;
	if (shouldClose && drawerContent.value) {
		isDragging.value = false;
		isClosing.value = true;
		const isVertical = props.position === 'bottom' || props.position === 'top';
		const total = isVertical ? drawerContent.value.offsetHeight : drawerContent.value.offsetWidth;
		dragOffset.value = isVertical
			? props.position === 'bottom'
				? total
				: -total
			: props.position === 'left'
				? -total
				: total;
		setTimeout(() => {
			closeDrawer();
			isClosing.value = false;
			dragOffset.value = 0;
			velocity.value = 0;
		}, 300);
	} else {
		isDragging.value = false;
		dragOffset.value = 0;
		velocity.value = 0;
	}
};

const handleTouchEnd = () => finishDrag();

const handleMouseDown = (e: MouseEvent) => {
	const target = e.target as HTMLElement;
	if (target.closest('button, a, input, select, textarea')) return;
	if (!shouldDrag()) return;
	e.preventDefault();
	isDragging.value = true;
	startY.value = e.clientY;
	startX.value = e.clientX;
	lastY.value = e.clientY;
	lastX.value = e.clientX;
	startTime.value = Date.now();
	dragOffset.value = 0;

	const handleMouseMove = (moveEvent: MouseEvent) => {
		if (!isDragging.value) return;
		moveEvent.preventDefault();
		const deltaTime = Date.now() - startTime.value;
		const isVertical = props.position === 'bottom' || props.position === 'top';
		if (isVertical) {
			let delta = moveEvent.clientY - startY.value;
			if (props.position === 'bottom' && delta < 0) delta = 0;
			if (props.position === 'top' && delta > 0) delta = 0;
			velocity.value = (moveEvent.clientY - lastY.value) / (deltaTime || 1);
			lastY.value = moveEvent.clientY;
			dragOffset.value = delta;
		} else {
			let delta = moveEvent.clientX - startX.value;
			if (props.position === 'left' && delta > 0) delta = 0;
			if (props.position === 'right' && delta < 0) delta = 0;
			velocity.value = (moveEvent.clientX - lastX.value) / (deltaTime || 1);
			lastX.value = moveEvent.clientX;
			dragOffset.value = delta;
		}
	};
	const cleanup = () => {
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', cleanup);
		document.removeEventListener('mouseleave', cleanup);
		finishDrag();
	};
	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', cleanup);
	document.addEventListener('mouseleave', cleanup);
};

// Scroll lock
watch(isOpen, (open: boolean) => {
	if (import.meta.client) {
		document.body.style.overflow = open ? 'hidden' : '';
	}
});

// Escape key
const handleEscape = (e: KeyboardEvent) => {
	if (e.key === 'Escape' && props.dismissable && isOpen.value) closeDrawer();
};

onMounted(() => {
	if (import.meta.client) document.addEventListener('keydown', handleEscape);
});
onUnmounted(() => {
	if (import.meta.client) {
		document.removeEventListener('keydown', handleEscape);
		if (isOpen.value) document.body.style.overflow = '';
	}
});
</script>

<style scoped>
.drawer-overlay {
	position: fixed;
	inset: 0;
	background-color: rgba(0, 0, 0, 0.4);
	display: flex;
	z-index: 9999;
}
.drawer-overlay--bottom {
	align-items: flex-end;
	justify-content: center;
}
.drawer-overlay--top {
	align-items: flex-start;
	justify-content: center;
}
.drawer-overlay--left {
	align-items: stretch;
	justify-content: flex-start;
}
.drawer-overlay--right {
	align-items: stretch;
	justify-content: flex-end;
}

.drawer-content {
	background-color: var(--bg-card, #fff);
	position: relative;
	display: flex;
	flex-direction: column;
	box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
	border-top-left-radius: 12px;
	border-top-right-radius: 0;
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 0;
}
.drawer-content--bottom {
	width: 100%;
	max-height: 85dvh;
	border-radius: 16px 16px 0 0;
}
.drawer-content--top {
	width: 100%;
	max-height: 85dvh;
	border-radius: 0 0 16px 16px;
}
.drawer-content--left {
	width: 480px;
	max-width: 90vw;
	height: 100dvh;
}
.drawer-content--right {
	width: 520px;
	max-width: 90vw;
	height: 100dvh;
}

.drawer-header {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: 16px 20px;
	border-bottom: 1px solid var(--border, #e5e7eb);
	flex-shrink: 0;
	min-height: 56px;
	position: relative;
}
.drawer-header--with-title {
	justify-content: space-between;
}
.drawer-title {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary, #111);
	margin: 0;
}
.drawer-handle {
	position: absolute;
	left: 50%;
	top: 10px;
	transform: translateX(-50%);
	width: 36px;
	height: 4px;
	background-color: var(--border, #e5e7eb);
	border-radius: 999px;
}
.drawer-close {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	background-color: var(--bg-surface, #f4f5f7);
	border: none;
	border-radius: 50%;
	color: var(--text-secondary, #666);
	cursor: pointer;
	transition: background-color 0.15s ease;
	flex-shrink: 0;
}
.drawer-close:hover {
	background-color: var(--border, #e5e7eb);
}
.drawer-body {
	flex: 1;
	overflow-y: auto;
	overflow-x: hidden;
}

/* Transitions */
.drawer-enter-active,
.drawer-leave-active {
	transition: opacity 0.25s ease;
}
.drawer-enter-active .drawer-content,
.drawer-leave-active .drawer-content {
	transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1) !important;
}
.drawer-enter-from,
.drawer-leave-to {
	opacity: 0;
}
.drawer-enter-from .drawer-content--bottom,
.drawer-leave-to .drawer-content--bottom {
	transform: translateY(100%);
}
.drawer-enter-from .drawer-content--top,
.drawer-leave-to .drawer-content--top {
	transform: translateY(-100%);
}
.drawer-enter-from .drawer-content--left,
.drawer-leave-to .drawer-content--left {
	transform: translateX(-100%);
}
.drawer-enter-from .drawer-content--right,
.drawer-leave-to .drawer-content--right {
	transform: translateX(100%);
}
.drawer-enter-to,
.drawer-leave-from {
	opacity: 1;
}
.drawer-enter-to .drawer-content,
.drawer-leave-from .drawer-content {
	transform: translate(0, 0);
}
</style>
