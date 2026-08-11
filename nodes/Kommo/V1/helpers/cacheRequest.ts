import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

type MyFunction = (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;

const CACHE_TIME = 30 * 1000;

interface CacheEntry {
	expiresAt: number;
	data: Promise<INodePropertyOptions[]>;
}

const cache = new Map<string, CacheEntry>();

export const cacheOptionsRequest = (fnc: MyFunction) => {
	return async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const now = Date.now();
		const node = this.getNode();
		const key = `${node.id}:${fnc.name}:${JSON.stringify(node.credentials)}:${JSON.stringify(
			node.parameters,
		)}`;
		const cached = cache.get(key);
		if (cached && cached.expiresAt > now) return cached.data;

		for (const [cacheKey, entry] of cache) {
			if (entry.expiresAt <= now) cache.delete(cacheKey);
		}

		const request = fnc.call(this);
		cache.set(key, { expiresAt: Number.POSITIVE_INFINITY, data: request });

		try {
			const data = await request;
			cache.set(key, {
				expiresAt: Date.now() + CACHE_TIME,
				data: Promise.resolve(data),
			});
			return data;
		} catch (error) {
			cache.delete(key);
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	};
};
