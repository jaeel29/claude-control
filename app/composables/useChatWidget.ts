// Visibility of the persistent ChatWidget rail. Backed by useState so the layout
// (widget) and any toggle button share one source of truth across navigation.
export const useChatWidget = () => {
	const visible = useState<boolean>('chat-widget-visible', () => true);

	function hide() {
		visible.value = false;
	}
	function show() {
		visible.value = true;
	}
	function toggle() {
		visible.value = !visible.value;
	}

	return { visible, hide, show, toggle };
};
