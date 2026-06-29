<template>
  <component
    :is="to ? resolveTag : 'button'"
    :to="to && !isExternal ? to : undefined"
    :href="to && isExternal ? to : undefined"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled"
    :class="[
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      `btn--${radius}`,
      {
        'btn--disabled': disabled,
        'btn--with-icon-left': !!$slots['icon-left'],
        'btn--with-icon-right': !!$slots['icon-right'],
      },
    ]"
  >
    <span v-if="$slots['icon-left']" class="btn__icon" aria-hidden="true">
      <slot name="icon-left" />
    </span>
    <slot />
    <span v-if="$slots['icon-right']" class="btn__icon" aria-hidden="true">
      <slot name="icon-right" />
    </span>
  </component>
</template>

<script setup lang="ts">
interface Props {
  /** Internal route or external URL. Internal → NuxtLink, external → <a>. */
  to?: string
  variant?: 'primary' | 'neutral' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  radius?: 'rounded' | 'pill'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  radius: 'rounded',
  type: 'button',
  disabled: false,
})

const isExternal = computed(() => !!props.to && /^https?:\/\//.test(props.to))
const resolveTag = computed(() => (isExternal.value ? 'a' : resolveComponent('NuxtLink')))
</script>

<style scoped lang="scss">
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-weight: 500;
  transition: background-color var(--transition-fast, 120ms ease),
    color var(--transition-fast, 120ms ease), box-shadow var(--transition-fast, 120ms ease),
    opacity var(--transition-fast, 120ms ease), border-color var(--transition-fast, 120ms ease);
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none;
  flex-shrink: 0;
}

/* Radius */
.btn--rounded {
  border-radius: 10px;
}
.btn--pill {
  border-radius: 999px;
}

/* Sizes */
.btn--sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm, 14px);
  height: 34px;
}
.btn--md {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm, 14px);
  height: 40px;
}
.btn--lg {
  padding: 12px 22px;
  font-size: var(--text-base, 16px);
  height: 48px;
}

/* Icon slots */
.btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.btn--sm.btn--with-icon-left { padding-left: var(--space-3); }
.btn--sm.btn--with-icon-right { padding-right: var(--space-3); }
.btn--md.btn--with-icon-left,
.btn--lg.btn--with-icon-left { padding-left: var(--space-3); }
.btn--md.btn--with-icon-right,
.btn--lg.btn--with-icon-right { padding-right: var(--space-3); }

/* Variants — mapped to claude-control theme tokens */
.btn--primary {
  background-color: var(--color-text);
  color: var(--color-bg);
  border-color: var(--color-text);

  &:hover { opacity: 0.88; }
}

.btn--neutral {
  background-color: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);

  &:hover { background-color: var(--color-surface-muted); }
}

.btn--ghost {
  background-color: transparent;
  color: var(--color-text-muted);
  border-color: transparent;

  &:hover {
    color: var(--color-text);
    background-color: var(--color-surface-muted);
  }
}

.btn--outline {
  background-color: transparent;
  color: var(--color-text);
  border-color: var(--color-border);

  &:hover { background-color: var(--color-surface-muted); }
}

.btn--danger {
  background-color: var(--badge-red-filled);
  color: var(--color-white);
  border-color: var(--badge-red-filled);

  &:hover { opacity: 0.9; }
}

.btn--disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
