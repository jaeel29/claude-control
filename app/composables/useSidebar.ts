// Mobile off-canvas sidebar open/close state. Shared via useState so the layout
// (hamburger + backdrop) and the sidebar itself agree. Only relevant ≤ md; on
// desktop the sidebar is always in-flow and this is ignored.
export const useSidebar = () => {
	const open = useState<boolean>('sidebar-open', () => false);
	return {
		open,
		openSidebar: () => { open.value = true; },
		closeSidebar: () => { open.value = false; },
		toggleSidebar: () => { open.value = !open.value; },
	};
};
