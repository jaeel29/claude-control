import type { NitroFetchOptions } from 'nitropack';
import type { AsyncDataOptions } from '#app';

/** Normalized API error (local app — no auth codes, just a message + status). */
export interface ApiError {
	message: string;
	status?: number;
}

/**
 * The result envelope imperative calls return: `ok` + typed `data` (null on
 * failure) + a normalized `error` (null on success).
 */
export interface ApiResult<T> {
	ok: boolean;
	data: T | null;
	error: ApiError | null;
}

type ApiOptions = Omit<NitroFetchOptions<string>, 'method' | 'baseURL'>;
type BodyOptions = Omit<ApiOptions, 'body'>;
type ApiBody = NitroFetchOptions<string>['body'];

function toApiError(err: any): ApiError {
	return {
		message: err?.data?.message ?? err?.message ?? 'Request failed',
		status: err?.statusCode ?? err?.response?.status,
	};
}

/**
 * Shared API layer over the configured `$api` instance (plugins/api.ts), ported
 * from Diali.ai's useApi. Two styles, both backed by the same `$api`:
 *
 *  • Imperative — `get/post/put/patch/del` resolve to `ApiResult<T>` for event
 *    handlers / mutations:  const { ok, data, error } = await api.post('/run', body)
 *  • Declarative (SSR-safe) — `data(key, path, opts)` wraps `useAsyncData` so
 *    component fetching is de-duplicated and exposes the full state machine
 *    (data / pending / error / status / refresh). Pass `{ server: false }` for
 *    client-only views.
 */
export const useApi = () => {
	const { $api } = useNuxtApp();

	async function request<T>(path: string, opts: NitroFetchOptions<string>): Promise<ApiResult<T>> {
		try {
			const data = await $api<T>(path, opts);
			return { ok: true, data, error: null };
		} catch (err) {
			return { ok: false, data: null, error: toApiError(err) };
		}
	}

	const get = <T>(path: string, opts?: ApiOptions) => request<T>(path, { ...opts, method: 'GET' });
	const post = <T>(path: string, body?: ApiBody, opts?: BodyOptions) =>
		request<T>(path, { ...opts, method: 'POST', body });
	const put = <T>(path: string, body?: ApiBody, opts?: BodyOptions) =>
		request<T>(path, { ...opts, method: 'PUT', body });
	const patch = <T>(path: string, body?: ApiBody, opts?: BodyOptions) =>
		request<T>(path, { ...opts, method: 'PATCH', body });
	/** `del` (not `delete` — reserved word). */
	const del = <T>(path: string, opts?: ApiOptions) => request<T>(path, { ...opts, method: 'DELETE' });

	/**
	 * SSR-safe declarative fetch — `useAsyncData` over `$api`. Returns the standard
	 * AsyncData ({ data, pending, error, status, refresh, … }) for loading states.
	 */
	function data<T>(key: string, path: string, opts?: ApiOptions & AsyncDataOptions<T>) {
		const { server, lazy, watch, immediate, default: def, transform, getCachedData, deep, dedupe, ...fetchOpts } =
			opts ?? {};
		return useAsyncData<T>(key, () => $api<T>(path, fetchOpts), {
			server,
			lazy,
			watch,
			immediate,
			default: def,
			transform,
			getCachedData,
			deep,
			dedupe,
		});
	}

	return { get, post, put, patch, del, data, raw: $api };
};
