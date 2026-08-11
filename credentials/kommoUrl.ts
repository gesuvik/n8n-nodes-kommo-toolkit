export const KOMMO_SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

export function normalizeKommoSubdomain(value: unknown): string {
	const subdomain = String(value ?? '').trim();
	if (!KOMMO_SUBDOMAIN_PATTERN.test(subdomain)) {
		throw new Error('Invalid Kommo account subdomain');
	}
	return subdomain.toLowerCase();
}

export function normalizeKommoApiPath(value: unknown): string {
	const endpoint = String(value ?? '').trim();
	if (!/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/i.test(endpoint)) {
		throw new Error('Invalid Kommo API endpoint');
	}
	return endpoint;
}

export function buildKommoApiUrl(subdomainValue: unknown, endpoint: string): string {
	const subdomain = normalizeKommoSubdomain(subdomainValue);
	const safeEndpoint = normalizeKommoApiPath(endpoint);
	const baseUrl = new URL(`https://${subdomain}.kommo.com/api/v4/`);
	const url = new URL(safeEndpoint, baseUrl);

	if (
		url.origin !== baseUrl.origin ||
		!url.pathname.startsWith(baseUrl.pathname) ||
		url.search ||
		url.hash
	) {
		throw new Error('Invalid Kommo API endpoint');
	}

	return url.toString();
}
