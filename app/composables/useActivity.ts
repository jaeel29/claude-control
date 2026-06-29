export interface ConversationMessage {
	role: 'user' | 'assistant' | 'tool';
	text: string;
	fullText: string;
	timestamp: string;
	toolName?: string;
	/** Global indices of any images attached to this message (served lazily). */
	images?: number[];
	/** Parsed todo list when the tool is TodoWrite — rendered as a checklist. */
	todos?: { content: string; status: 'pending' | 'in_progress' | 'completed' }[];
}

export interface ActivityItem {
	text: string;
	fullText: string;
	timestamp: string;
	project: string;
	sessionId: string;
	cwd: string;
	isRunning: boolean;
	aiTitle: string | null;
	messages: ConversationMessage[];
}

/**
 * Recent Claude Code activity (domain composable, Diali-style — state owned via
 * useState, fetched through the shared useApi().data() layer). Client-only +
 * lazy so it never blocks navigation; exposes `pending` for loading skeletons.
 *
 * Shared `key` ('activity') de-dupes the fetch across every component that calls
 * this (ChatWidget, overview, activity page) — one request, one cache.
 */
export const useActivity = () => {
	const api = useApi();

	const { data, pending, error, refresh, status } = api.data<{ items: ActivityItem[] }>(
		'activity',
		'/activity',
		{ server: false, lazy: true, default: () => ({ items: [] }) },
	);

	const items = computed<ActivityItem[]>(() => data.value?.items ?? []);

	return { items, pending, error, refresh, status };
};
