import { BREAKPOINTS } from '~/utils/breakpoints';

// Visibility of the persistent ChatWidget rail. Backed by useState so the layout
// (widget) and any toggle button share one source of truth across navigation.
export const useChatWidget = () => {
	const visible = useState<boolean>('chat-widget-visible', () => true);
	// Tracks whether the initial breakpoint default has been applied (once).
	const inited = useState<boolean>('chat-widget-inited', () => false);

	function hide() {
		visible.value = false;
	}
	function show() {
		visible.value = true;
	}
	function toggle() {
		visible.value = !visible.value;
	}

	// On first client mount, start hidden on small screens (below lg) so the
	// overlay rail doesn't cover the content by default; it opens on demand
	// (floating button or clicking a chat row). Runs once.
	function initResponsiveDefault() {
		if (inited.value || typeof window === 'undefined') return;
		inited.value = true;
		if (window.innerWidth <= BREAKPOINTS.lg) visible.value = false;
	}

	return { visible, hide, show, toggle, initResponsiveDefault };
};
