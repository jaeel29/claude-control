// ============================================================================
// Breakpoints (JS mirror) — keep in lock-step with `app/assets/css/_breakpoints.scss`.
//
// The Sass partial is the source of truth for CSS @media rules; this file is the
// JS twin for the cases where layout is driven by reactive state (e.g. a value
// bound to a Vue computed) and so can't be expressed in pure CSS. Both must use
// the SAME pixel values — change one, change the other.
// ============================================================================

export const BREAKPOINTS = {
	xxs: 375,
	xs: 480,
	sm: 640,
	md: 768,
	lg: 960,
	xl: 1200,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** `max-width` query — matches at the breakpoint width and BELOW (mirrors `respond-to`). */
export function downQuery(name: Breakpoint): string {
	return `(max-width: ${BREAKPOINTS[name]}px)`;
}

/** `min-width` query — matches strictly ABOVE the breakpoint (mirrors `respond-from`, bp + 1px). */
export function upQuery(name: Breakpoint): string {
	return `(min-width: ${BREAKPOINTS[name] + 1}px)`;
}
