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
	width: 168px;
	background: #fff;
	// border: 1px solid #b1b1b1;
	border-radius: 8px;
	font-size: 12px;
	font-weight: 500;
	color: #414746;
	cursor: pointer;
	box-shadow: 0 1px 2px #656565;
	transition: border-color 0.15s;

	[data-theme='dark'] & {
		border-color: rgba(220, 228, 229, 0.1);
		color: rgba(255, 255, 255, 0.6);
	}

	&:hover {
		border-color: #d0cdc8;

		[data-theme='dark'] & {
			border-color: rgba(220, 228, 229, 0.2);
		}
	}
}

.dd-value {
	flex: 1;
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	&--placeholder {
		color: #b0b8b7;

		[data-theme='dark'] & {
			color: rgba(255, 255, 255, 0.25);
		}
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
	background:  #fff;
	border: 1px solid #e8eaea;
	border-radius: 10px;
	box-shadow:
		0 4px 16px rgba(0, 0, 0, 0.08),
		0 1px 3px rgba(0, 0, 0, 0.04);
	padding: 4px;
	z-index: 100;

	[data-theme='dark'] & {
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}
}

.dd-search {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 5px 8px;
	// border-bottom: 1px solid #e8eaea;
	margin-bottom: 4px;
	height: 32px;

	[data-theme='dark'] & {
		border-color: rgba(255, 255, 255, 0.08);
	}
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
	color: #414746;
	width: 100%;

	&::placeholder {
		color: #b0b8b7;
	}

	[data-theme='dark'] & {
		color: rgba(255, 255, 255, 0.7);

		&::placeholder {
			color: rgba(255, 255, 255, 0.25);
		}
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
	color: #b0b8b7;
	text-align: center;

	[data-theme='dark'] & {
		color: rgba(255, 255, 255, 0.3);
	}
}

.dd-item {
	padding: 7px 10px;
	font-size: 12px;
	font-weight: 500;
	color: #414746;
	border-radius: 7px;
	cursor: pointer;
	transition: background 0.1s;

	[data-theme='dark'] & {
		color: rgba(255, 255, 255, 0.7);
	}

	&:hover {
		background: #f3f4f3;

		[data-theme='dark'] & {
			background: rgba(255, 255, 255, 0.06);
		}
	}

	&--active {
		background: #eef0ee;
		color: #1b2020;

		[data-theme='dark'] & {
			background: rgba(255, 255, 255, 0.1);
			color: #fff;
		}
	}
}

/* Full-width variant — matches Input component styling */
.dd--full {
	width: 100%;

	.dd-trigger {
		width: 100%;
		height: 36px;
		border: none;
		border-radius: 8px;
		box-shadow: 0 0 0 1px #e8e8e8;
		font-size: 13px;
		color: #012c32;
		padding: 0 12px;
		transition: all 0.15s cubic-bezier(0, 1, 1, 1.01);

		&:hover {
			border-color: unset;
		}

		&:focus,
		&[aria-expanded='true'] {
			box-shadow:
				0 0 0 1.5px #00b695,
				0 0 0 4px rgba(0, 182, 149, 0.2);
			outline: none;
		}

		[data-theme='dark'] & {
			color: rgba(255, 255, 255, 0.9);
			box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
			background: rgba(255, 255, 255, 0.04);
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
