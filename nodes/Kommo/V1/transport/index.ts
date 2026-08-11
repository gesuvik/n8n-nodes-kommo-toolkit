import {
	GenericValue,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	NodeApiError,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';
import { buildKommoApiUrl, normalizeKommoSubdomain } from '../../../../credentials/kommoUrl';

const MIN_REQUEST_INTERVAL_MS = 150;

let nextRequestAt = 0;
let requestScheduler = Promise.resolve();

function waitForRateLimit(): Promise<void> {
	const scheduled = requestScheduler.then(async () => {
		const waitTime = Math.max(0, nextRequestAt - Date.now());
		if (waitTime > 0) {
			await sleep(waitTime);
		}
		nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
	});

	requestScheduler = scheduled.catch(() => undefined);
	return scheduled;
}

function getValidationErrors(error: unknown): unknown {
	if (!error || typeof error !== 'object') return undefined;
	const cause = 'cause' in error ? error.cause : undefined;
	if (!cause || typeof cause !== 'object' || !('response' in cause)) return undefined;
	const response = cause.response;
	if (!response || typeof response !== 'object' || !('data' in response)) return undefined;
	const data = response.data;
	return data && typeof data === 'object' && 'validation-errors' in data
		? data['validation-errors']
		: undefined;
}

export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | GenericValue | GenericValue[] = {},
	qs: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	const credentialType = authenticationMethod === 'oAuth2' ? 'kommoOAuth2Api' : 'kommoLongLivedApi';
	const credentials = await this.getCredentials(credentialType);
	let subdomain: string;
	try {
		subdomain = normalizeKommoSubdomain(credentials.subdomain);
	} catch {
		throw new NodeOperationError(this.getNode(), 'Invalid Kommo account subdomain', {
			description: 'Enter only the subdomain, without protocol, dots, slashes, or .kommo.com.',
		});
	}
	let url: string;
	try {
		url = buildKommoApiUrl(subdomain, endpoint);
	} catch {
		throw new NodeOperationError(this.getNode(), 'Invalid Kommo API endpoint', {
			description: 'Use only API paths relative to /api/v4, without encoded or special characters.',
		});
	}

	const options: IHttpRequestOptions = {
		method,
		body,
		qs,
		url,
		allowedDomains: `${subdomain}.kommo.com`,
		sendCredentialsOnCrossOriginRedirect: false,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	};
	try {
		await waitForRateLimit();
		return await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		const concreteErrorsDescription = getValidationErrors(error);
		if (concreteErrorsDescription)
			throw new NodeOperationError(this.getNode(), 'Incorrect fields', {
				description: JSON.stringify(concreteErrorsDescription, null, 2),
			});
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	embeddedKey?: string,
) {
	// Kommo endpoints return different HAL envelopes; callers narrow the response shape.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const returnData: any[] = [];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let responseData: any;
	query.page = 1;
	query.limit = query.limit ? query.limit : 250;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		query.page++;
		if (embeddedKey) {
			const embedded = responseData?._embedded?.[embeddedKey];
			if (Array.isArray(embedded)) returnData.push(...embedded);
		} else {
			returnData.push(responseData);
		}
	} while (responseData?._links?.next?.href?.length);

	return returnData;
}
