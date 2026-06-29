/**
 * The shared `$api` fetch instance (pattern from Diali.ai's plugins/api.ts,
 * simplified for this local-only app — no auth, no CSRF, no multi-env proxy).
 *
 * It's a configured `$fetch` (ofetch) with the `/api` base URL so data
 * composables stop hand-rolling `$fetch('/api/…')`. Errors are NOT swallowed —
 * ofetch throws a FetchError on 4xx/5xx so callers normalize via `useApi`'s
 * {ok,data,error} helpers, or read `useAsyncData`'s `error` ref.
 */
export default defineNuxtPlugin(() => {
	const api = $fetch.create({
		baseURL: '/api',
	});

	return { provide: { api } };
});
