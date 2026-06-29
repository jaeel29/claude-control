<template>
	<div class="dd" :class="{ 'dd--full': fullWidth }" ref="root">
		<button class="dd-trigger" type="button" :aria-expanded="open" @click="open = !open">
			<span class="dd-value" :class="{ 'dd-value--placeholder': !modelValue }">{{
				modelValue ? selectedLabel : (placeholder ?? '')
			}}</span>
			<Icon name="lucide:chevron-down" :size="12" class="dd-caret" :class="{ 'dd-caret--open': open }" />
		</button>
		<Transition name="dd">
			<div v-if="open" class="dd-menu">
				<div v-if="searchable" class="dd-search">
					<Icon name="lucide:search" :size="16" class="dd-search-icon" />
					<input ref="searchInput" v-model="query" class="dd-search-input" placeholder="Search…" @mousedown.stop />
				</div>
				<ul class="dd-list">
					<li
						v-for="opt in filteredItems"
						:key="opt.value"
						class="dd-item"
						:class="{ 'dd-item--active': opt.value === modelValue }"
						@mousedown.prevent="pick(opt.value)"
					>
						{{ opt.label }}
					</li>
					<li v-if="filteredItems.length === 0" class="dd-empty">No results</li>
				</ul>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
type Opt = string | { value: string; label: string };

const props = defineProps<{
	modelValue: string;
	options: Opt[];
	fullWidth?: boolean;
	searchable?: boolean;
	placeholder?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const query = ref('');

const items = computed(() => props.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)));

const filteredItems = computed(() => {
	if (!props.searchable || !query.value) return items.value;
	const q = query.value.toLowerCase();
	return items.value.filter((o) => o.label.toLowerCase().includes(q));
});

const selectedLabel = computed(
	() => items.value.find((o) => o.value === props.modelValue)?.label ?? (props.modelValue || ''),
);

function pick(v: string) {
	emit('update:modelValue', v);
	open.value = false;
	query.value = '';
}

watch(open, (val) => {
	if (val && props.searchable) nextTick(() => searchInput.value?.focus());
	if (!val) query.value = '';
});

function outside(e: MouseEvent) {
	if (root.value && !root.value.contains(e.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener('mousedown', outside));
onUnmounted(() => document.removeEventListener('mousedown', outside));
</script>

<style scoped lang="scss">
.dd {
	position: relative;
}

.dd-trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
	padding: 5px 8px;
	min-width: 120px;
	height: 32px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: 8px;
	font-size: 12px;
	font-weight: 500;
	color: var(--text-primary);
	cursor: pointer;
	transition: border-color 0.15s, background 0.15s;

	&:hover {
		border-color: var(--color-text-subtle);
		background: var(--bg-card-hover);
	}

	&[aria-expanded='true'] {
		border-color: var(--color-text-muted);
	}
}

.dd-value {
	flex: 1;
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	&--placeholder {
		color: var(--text-muted);
	}
}

.dd-caret {
	opacity: 0.45;
	flex-shrink: 0;
	transition: transform 0.15s;

	&--open {
		transform: rotate(180deg);
	}
}

.dd-menu {
	position: absolute;
	top: calc(100% + 4px);
	right: 0;
	min-width: 168px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: 10px;
	box-shadow: var(--shadow-card);
	padding: 4px;
	z-index: 100;
}

.dd-search {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 5px 8px;
	margin-bottom: 4px;
	height: 32px;
}

.dd-search-icon {
	opacity: 0.35;
	flex-shrink: 0;
}

.dd-search-input {
	flex: 1;
	border: none;
	outline: none;
	background: transparent;
	font-size: 12px;
	font-weight: 500;
	color: var(--text-primary);
	width: 100%;

	&::placeholder {
		color: var(--text-muted);
	}
}

.dd-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.dd-empty {
	padding: 7px 10px;
	font-size: 12px;
	color: var(--text-muted);
	text-align: center;
}

.dd-item {
	padding: 7px 10px;
	font-size: 12px;
	font-weight: 500;
	color: var(--text-secondary);
	border-radius: 7px;
	cursor: pointer;
	transition: background 0.1s;

	&:hover {
		background: var(--bg-card-hover);
	}

	&--active {
		background: var(--accent-dim);
		color: var(--text-primary);
	}
}

/* Full-width variant — matches Input component styling */
.dd--full {
	width: 100%;

	.dd-trigger {
		width: 100%;
		height: 36px;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 13px;
		color: var(--text-primary);
		padding: 0 12px;
		transition: all 0.15s cubic-bezier(0, 1, 1, 1.01);

		&:focus,
		&[aria-expanded='true'] {
			border-color: var(--accent);
			box-shadow: 0 0 0 3px var(--accent-dim);
			outline: none;
		}
	}

	.dd-menu {
		left: 0;
		right: 0;
		min-width: unset;
	}

	.dd-list {
		max-height: 220px;
		overflow-y: auto;
	}
}

.dd-enter-active,
.dd-leave-active {
	transition:
		opacity 0.12s ease,
		transform 0.12s ease;
}

.dd-enter-from,
.dd-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
