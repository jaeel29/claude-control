import { type Breakpoint, downQuery, upQuery } from '~/utils/breakpoints';

/**
 * Reactive `matchMedia` against a named breakpoint. Client-only — SSR returns
 * `false` (pair with a CSS `respond-to`/`respond-from` belt to avoid a
 * pre-hydration flash). Pixel values come from the shared breakpoints map, so
 * JS and CSS never drift.
 *
 *   const belowLg = useBreakpoint('lg', 'down') // true ≤ 960px
 *   const fromLg  = useBreakpoint('lg', 'up')   // true ≥ 961px
 */
export function useBreakpoint(name: Breakpoint, direction: 'down' | 'up' = 'down') {
	const matches = ref(false);
	let mql: MediaQueryList | null = null;
	const sync = () => {
		matches.value = mql?.matches ?? false;
	};

	onMounted(() => {
		mql = window.matchMedia(direction === 'down' ? downQuery(name) : upQuery(name));
		sync();
		mql.addEventListener('change', sync);
	});
	onUnmounted(() => mql?.removeEventListener('change', sync));

	return matches;
}
