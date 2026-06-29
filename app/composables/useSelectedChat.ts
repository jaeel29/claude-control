// Shared selection state for the persistent ChatWidget. Clicking a chat row
// anywhere in the dashboard sets the selected sessionId; the widget (mounted
// once in the layout) renders that conversation instead of opening a drawer.
export const useSelectedChat = () => {
	// null = no explicit selection → widget falls back to the latest/running chat.
	const selectedSessionId = useState<string | null>('selected-chat', () => null);

	function selectChat(sessionId: string | null) {
		selectedSessionId.value = sessionId;
	}

	return { selectedSessionId, selectChat };
};
