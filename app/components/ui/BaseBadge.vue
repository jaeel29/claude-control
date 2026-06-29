<template>
  <span :class="badgeClasses" class="badge">
    <slot />
  </span>
</template>

<script setup lang="ts">
interface BaseBadgeProps {
  variant?: 'filled' | 'light' | 'lighter' | 'stroke' | 'glass'
  size?: 'small' | 'medium' | 'large'
  color?: 'gray' | 'blue' | 'orange' | 'red' | 'green' | 'yellow' | 'purple' | 'sky' | 'pink' | 'teal' | 'brand'
  /** When true (e.g. icon + label in the default slot), layout is start-aligned without centered flex. */
  hasIcon?: boolean
  /** Surface the badge sits on. 'dark' tunes the glass shadow/highlight for a dark
   *  background (e.g. the CTA band); 'light' (default) is the standard look. */
  mode?: 'light' | 'dark'
}

const props = withDefaults(defineProps<BaseBadgeProps>(), {
  variant: 'glass',
  size: 'small',
  color: 'gray',
  hasIcon: false,
  mode: 'light',
})

const badgeClasses = computed(() => {
  const baseClasses = 'badge'
  const variantClass = `badge--${props.variant}`
  const sizeClass = `badge--${props.size}`
  const colorClass = `badge--${props.color}`
  const iconClass = props.hasIcon ? 'badge--with-icon' : ''
  const modeClass = props.mode === 'dark' ? 'badge--on-dark' : ''

  return [baseClasses, variantClass, sizeClass, colorClass, iconClass, modeClass].filter(Boolean)
})
</script>

<style scoped lang="scss">
/* All colors live in assets/css/variables.css (--badge-*), with light values in
   :root and dark values under [data-theme='dark'] — this component is theme-free.
   Each color class maps its tokens onto private --_* props; variants consume them. */

/* Binds one color's --badge-<c>-<role> tokens onto the shared --_<role> props. */
@mixin badge-color($c) {
  --_filled-bg: var(--badge-#{$c}-filled);
  --_light-bg: var(--badge-#{$c}-light-bg);
  --_light-text: var(--badge-#{$c}-light-text);
  --_lighter-bg: var(--badge-#{$c}-lighter-bg);
  --_lighter-text: var(--badge-#{$c}-lighter-text);
  --_stroke-text: var(--badge-#{$c}-stroke-text);
  --_stroke-border: var(--badge-#{$c}-stroke-border);
  --_glass-bg: var(--badge-#{$c}-glass-bg);
  --_glass-border: var(--badge-#{$c}-glass-border);
  --_glass-text: var(--badge-#{$c}-glass-text);
}

/* ── Base ── */
.badge {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  border-radius: 999px;
  text-align: center;
  white-space: nowrap;
  transition: all 0.2s ease;
  letter-spacing: -0.015px;
  text-transform: uppercase;
  border: 1px solid transparent;
  max-width: fit-content;
}

/* Icon + label: no centered flex; icon and text align from the start */
.badge.badge--with-icon {
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  text-align: left;
  width: fit-content;
}

/* ── Sizes ── */
.badge--small {
  padding: 2px 6px;
  font-size: 10px;
}

.badge--medium {
  padding: 4px 10px;
  font-size: 11px;
}

.badge--large {
  padding: 6px 14px;
  font-size: 12px;
}

/* ── Variants ── */
.badge--filled {
  background: var(--_filled-bg);
  color: var(--_filled-text, var(--color-white));
}

.badge--light {
  background: var(--_light-bg);
  color: var(--_light-text);
}

.badge--lighter {
  background: var(--_lighter-bg);
  color: var(--_lighter-text);
}

.badge--stroke {
  background: transparent;
  color: var(--_stroke-text);
  border-color: var(--_stroke-border);
}

/* Glass — frosted pill */
.badge.badge--glass {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5px 9px;
  border-radius: 40px;
  text-align: center;
  font-feature-settings:
    'salt' on,
    'ss01' on,
    'ss03' on,
    'ss04' on;
  font-family: var(--font-sans);
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  letter-spacing: -0.1px;
  text-transform: none;
  background: var(--_glass-bg);
  border-color: var(--_glass-border);
  color: var(--_glass-text);
  box-shadow: var(--badge-glass-shadow);
  text-shadow: var(--badge-glass-text-shadow);
}

.badge.badge--glass.badge--with-icon {
  justify-content: flex-start;
  align-items: center;
  text-align: left;
}

/* Glass badge on a dark surface (mode="dark") */
.badge.badge--glass.badge--on-dark {
  box-shadow: var(--badge-glass-shadow-on-dark);
  text-shadow: var(--badge-glass-text-shadow-on-dark);
}

/* ── Colors ── */
.badge--gray   { @include badge-color(gray); }
.badge--blue   { @include badge-color(blue); }
.badge--orange { @include badge-color(orange); }
.badge--red    { @include badge-color(red); }
.badge--green  { @include badge-color(green); }
.badge--yellow { @include badge-color(yellow); }
.badge--purple { @include badge-color(purple); }
.badge--sky    { @include badge-color(sky); }
.badge--pink   { @include badge-color(pink); }
.badge--teal   { @include badge-color(teal); }

/* brand pulls from shared accent tokens, so it can't use the uniform mixin */
.badge--brand {
  --_filled-bg: var(--color-accent-vivid);
  --_filled-text: var(--badge-brand-filled-text);
  --_light-bg: var(--badge-brand-tint-bg);
  --_light-text: var(--color-accent-vivid);
  --_lighter-bg: var(--badge-brand-tint-bg);
  --_lighter-text: var(--color-accent-vivid);
  --_stroke-text: var(--color-accent-vivid);
  --_stroke-border: var(--color-accent-vivid);
  --_glass-bg: var(--badge-brand-glass-bg);
  --_glass-border: var(--badge-brand-glass-border);
  --_glass-text: var(--badge-brand-glass-text);
}

.badge--glass.badge--brand {
  letter-spacing: 0.025em;
}
</style>
