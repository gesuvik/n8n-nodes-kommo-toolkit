const assert = require('node:assert/strict');
const { test } = require('node:test');

const { Kommo } = require('../dist/nodes/Kommo/Kommo.node.js');
const { KommoApi, normalizeApiEndpoint } = require('../dist/nodes/Kommo/KommoApi.node.js');
const { KommoBulk } = require('../dist/nodes/Kommo/KommoBulk.node.js');
const { KommoTrigger } = require('../dist/nodes/Kommo/KommoTrigger.node.js');
const { apiRequestAllItems } = require('../dist/nodes/Kommo/V1/transport/index.js');
const { kommoLongLivedApi } = require('../dist/credentials/kommoLongLivedApi.credentials.js');
const { kommoOAuth2Api } = require('../dist/credentials/kommoOAuth2Api.credentials.js');
const {
	kommoWebhookSecretApi,
} = require('../dist/credentials/kommoWebhookSecretApi.credentials.js');

const fakeNode = {
	name: 'Kommo Toolkit Test',
	type: 'kommo',
	typeVersion: 1,
	position: [0, 0],
};

const webhookSecret = '0123456789abcdef0123456789abcdef';

function returnJsonArray(data) {
	return (Array.isArray(data) ? data : [data]).map((json) => ({ json }));
}

test('toolkit exposes four node types and 68 configured Kommo operations', () => {
	const main = new Kommo();
	const api = new KommoApi();
	const bulk = new KommoBulk();
	const trigger = new KommoTrigger();
	const resourceProperty = main.description.properties.find(
		(property) => property.name === 'resource',
	);
	const operationCount = main.description.properties
		.filter((property) => property.name === 'operation')
		.reduce((total, property) => total + property.options.length, 0);

	assert.equal(resourceProperty.options.length, 18);
	assert.equal(operationCount, 68);
	assert.deepEqual(
		[main, api, bulk, trigger].map((node) => node.description.name),
		['kommo', 'kommoApi', 'kommoBulk', 'kommoTrigger'],
	);
	for (const node of [main, api, bulk, trigger]) {
		assert.equal(
			node.description.properties.find((property) => property.name === 'authentication')
				.noDataExpression,
			true,
			`${node.description.name} authentication must not vary by input item`,
		);
	}
});

test('advanced API endpoint normalization accepts relative paths and rejects URL injection', () => {
	assert.equal(normalizeApiEndpoint(fakeNode, '/api/v4/leads/42'), 'leads/42');
	for (const endpoint of [
		'https://evil.example/leads',
		'../account',
		'%2e%2e/account',
		'%252e%252e/account',
		'leads/%2f/account',
		'leads//42',
		'leads?limit=1',
		'leads#fragment',
		'leads\\42',
	]) {
		assert.throws(() => normalizeApiEndpoint(fakeNode, endpoint), /safe path relative/);
	}
});

test('advanced API node authenticates, applies query parameters, and unwraps HAL collections', async () => {
	let observedRequest;
	const parameters = {
		authentication: 'longLivedToken',
		method: 'GET',
		endpoint: '/api/v4/leads',
		queryJson: '{"limit":2}',
		returnAll: false,
		embeddedKey: 'leads',
	};
	const context = {
		getInputData: () => [{ json: { source: 'test' } }],
		getNodeParameter: (name) => parameters[name],
		getCredentials: async () => ({ subdomain: 'example' }),
		getNode: () => fakeNode,
		continueOnFail: () => false,
		helpers: {
			returnJsonArray,
			constructExecutionMetaData: (items, { itemData }) =>
				items.map((item) => ({ ...item, pairedItem: itemData })),
			httpRequestWithAuthentication: async (_credentialType, options) => {
				observedRequest = options;
				return { _embedded: { leads: [{ id: 10 }, { id: 11 }] } };
			},
		},
	};

	const [result] = await new KommoApi().execute.call(context);

	assert.equal(observedRequest.url, 'https://example.kommo.com/api/v4/leads');
	assert.deepEqual(observedRequest.qs, { limit: 2 });
	assert.deepEqual(
		result.map((item) => item.json.id),
		[10, 11],
	);
	assert.deepEqual(result[0].pairedItem, { item: 0 });
	assert.equal(observedRequest.allowedDomains, 'example.kommo.com');
	assert.equal(observedRequest.sendCredentialsOnCrossOriginRedirect, false);
});

test('credentials constrain secrets to validated Kommo account domains', async () => {
	const longLived = new kommoLongLivedApi();
	const oauth = new kommoOAuth2Api();
	const webhook = new kommoWebhookSecretApi();
	const validateWebhookSecret = new KommoTrigger().methods.credentialTest.validateWebhookSecret;
	const oauthProperties = Object.fromEntries(
		oauth.properties.map((property) => [property.name, property.default]),
	);

	assert.equal(longLived.test.request.allowedDomains, '*.kommo.com');
	assert.equal(longLived.test.request.sendCredentialsOnCrossOriginRedirect, false);
	assert.equal(oauthProperties.allowedHttpRequestDomains, 'domains');
	assert.equal(oauthProperties.allowedDomains, '*.kommo.com');
	assert.match(oauthProperties.accessTokenUrl, /SUBDOMAIN_PATTERN|\.test\(/);
	assert.equal(webhook.properties[0].name, 'secret');
	assert.equal(webhook.properties[0].typeOptions.password, true);
	assert.equal(webhook.properties[0].required, true);
	assert.deepEqual(await validateWebhookSecret({ data: { secret: 'too-short' } }), {
		status: 'Error',
		message: 'Webhook Secret must contain at least 32 characters',
	});
	assert.deepEqual(await validateWebhookSecret({ data: { secret: webhookSecret } }), {
		status: 'OK',
		message: 'Webhook Secret is valid',
	});

	const options = await longLived.authenticate(
		{ subdomain: 'sandbox-42', apiKey: 'secret' },
		{ url: 'https://sandbox-42.kommo.com/api/v4/account' },
	);
	assert.equal(options.allowedDomains, 'sandbox-42.kommo.com');
	assert.equal(options.sendCredentialsOnCrossOriginRedirect, false);
	await assert.rejects(
		longLived.authenticate(
			{ subdomain: 'evil.example/steal', apiKey: 'secret' },
			{ url: 'https://evil.example/steal' },
		),
		/Invalid Kommo account subdomain/,
	);
});

test('HAL pagination can return individual entities instead of page envelopes', async () => {
	const context = {
		getNodeParameter: () => 'longLivedToken',
		getCredentials: async () => ({ subdomain: 'example' }),
		getNode: () => fakeNode,
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, options) => {
				if (options.qs.page === 1) {
					return {
						_embedded: { leads: [{ id: 1 }, { id: 2 }] },
						_links: { next: { href: 'page-2' } },
					};
				}
				return { _embedded: { leads: [{ id: 3 }] }, _links: {} };
			},
		},
	};

	const result = await apiRequestAllItems.call(context, 'GET', 'leads', {}, {}, 'leads');
	assert.deepEqual(result, [{ id: 1 }, { id: 2 }, { id: 3 }]);
});

test('bulk node splits input into Kommo-recommended batches and preserves item pairing', async () => {
	const requests = [];
	const inputItems = Array.from({ length: 51 }, (_, index) => ({
		json: { name: `Lead ${index + 1}` },
	}));
	const parameters = {
		authentication: 'longLivedToken',
		entity: 'leads',
		operation: 'create',
		dataSource: 'inputItems',
		removeEmptyValues: true,
		batchSize: 50,
	};
	let nextId = 1;
	const context = {
		getInputData: () => inputItems,
		getNodeParameter: (name) => parameters[name],
		getCredentials: async () => ({ subdomain: 'example' }),
		getNode: () => fakeNode,
		continueOnFail: () => false,
		helpers: {
			returnJsonArray,
			httpRequestWithAuthentication: async (_credentialType, options) => {
				requests.push(options);
				return {
					_embedded: {
						leads: options.body.map((lead) => ({ ...lead, id: nextId++ })),
					},
				};
			},
		},
	};

	const [result] = await new KommoBulk().execute.call(context);

	assert.deepEqual(
		requests.map((request) => request.body.length),
		[50, 1],
	);
	assert.ok(requests.every((request) => request.method === 'POST'));
	assert.equal(result.length, 51);
	assert.deepEqual(result[50].pairedItem, { item: 50 });
});

test('bulk node preserves original pairing after empty inputs are removed', async () => {
	const parameters = {
		authentication: 'longLivedToken',
		entity: 'leads',
		operation: 'create',
		dataSource: 'inputItems',
		removeEmptyValues: true,
		batchSize: 50,
	};
	const context = {
		getInputData: () => [{ json: {} }, { json: { name: 'Real lead' } }],
		getNodeParameter: (name) => parameters[name],
		getCredentials: async () => ({ subdomain: 'example' }),
		getNode: () => fakeNode,
		continueOnFail: () => false,
		helpers: {
			returnJsonArray,
			httpRequestWithAuthentication: async (_credentialType, options) => ({
				_embedded: { leads: options.body.map((lead) => ({ ...lead, id: 1 })) },
			}),
		},
	};

	const [result] = await new KommoBulk().execute.call(context);
	assert.equal(result.length, 1);
	assert.deepEqual(result[0].pairedItem, { item: 1 });
});

test('bulk list operations reject non-numeric catalog IDs before making a request', async () => {
	const parameters = {
		authentication: 'longLivedToken',
		entity: 'catalogElements',
		catalogId: '../account',
		operation: 'create',
		dataSource: 'inputItems',
		removeEmptyValues: true,
		batchSize: 50,
	};
	let requested = false;
	const context = {
		getInputData: () => [{ json: { name: 'Unsafe' } }],
		getNodeParameter: (name) => parameters[name],
		getCredentials: async () => ({ subdomain: 'example' }),
		getNode: () => fakeNode,
		continueOnFail: () => false,
		helpers: {
			returnJsonArray,
			httpRequestWithAuthentication: async () => {
				requested = true;
				return {};
			},
		},
	};

	await assert.rejects(new KommoBulk().execute.call(context), /positive integer/);
	assert.equal(requested, false);
});

test('trigger registers and removes its own Kommo webhook', async () => {
	const requests = [];
	const destination = 'https://n8n.example/webhook/kommo';
	const securedDestination = `${destination}?kommo_secret=${webhookSecret}`;
	let registeredWebhook;
	const context = {
		getNodeWebhookUrl: () => destination,
		getNodeParameter(name) {
			if (name === 'events') return ['add_lead', 'status_lead'];
			if (name === 'authentication') return 'longLivedToken';
			throw new Error(`Unexpected parameter: ${name}`);
		},
		getCredentials: async (name) =>
			name === 'kommoWebhookSecretApi' ? { secret: webhookSecret } : { subdomain: 'example' },
		getNode: () => fakeNode,
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, options) => {
				requests.push(options);
				if (options.method === 'GET') {
					return { _embedded: { webhooks: registeredWebhook ? [registeredWebhook] : [] } };
				}
				if (options.method === 'POST') registeredWebhook = { ...options.body, disabled: false };
				if (options.method === 'DELETE') registeredWebhook = undefined;
				return { success: true };
			},
		},
	};
	const methods = new KommoTrigger().webhookMethods.default;

	assert.equal(await methods.checkExists.call(context), false);
	assert.equal(await methods.create.call(context), true);
	assert.equal(await methods.checkExists.call(context), true);
	assert.equal(await methods.delete.call(context), true);
	assert.equal(registeredWebhook, undefined);
	assert.deepEqual(
		requests.map((request) => request.method),
		['GET', 'GET', 'GET', 'POST', 'GET', 'GET', 'DELETE', 'GET'],
	);
	assert.deepEqual(requests[3].body, {
		destination: securedDestination,
		settings: ['add_lead', 'status_lead'],
	});
});

test('trigger replaces disabled or stale webhook registrations', async () => {
	const requests = [];
	const destination = 'https://n8n.example/webhook/kommo';
	const securedDestination = `${destination}?kommo_secret=${webhookSecret}`;
	let registeredWebhook = {
		destination,
		settings: ['add_lead'],
		disabled: true,
	};
	const context = {
		getNodeWebhookUrl: () => destination,
		getNodeParameter(name) {
			if (name === 'events') return ['status_lead', 'add_lead'];
			if (name === 'authentication') return 'longLivedToken';
			throw new Error(`Unexpected parameter: ${name}`);
		},
		getCredentials: async (name) =>
			name === 'kommoWebhookSecretApi' ? { secret: webhookSecret } : { subdomain: 'example' },
		getNode: () => fakeNode,
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, options) => {
				requests.push(options);
				if (options.method === 'GET') {
					return {
						_embedded: { webhooks: registeredWebhook ? [registeredWebhook] : [] },
					};
				}
				if (options.method === 'DELETE') registeredWebhook = undefined;
				if (options.method === 'POST') registeredWebhook = { ...options.body, disabled: false };
				return { success: true };
			},
		},
	};
	const methods = new KommoTrigger().webhookMethods.default;

	assert.equal(await methods.checkExists.call(context), false);
	assert.equal(await methods.create.call(context), true);
	assert.equal(await methods.checkExists.call(context), true);
	assert.deepEqual(
		requests.map((request) => request.method),
		['GET', 'GET', 'GET', 'DELETE', 'POST', 'GET'],
	);
	assert.deepEqual(requests[4].body, {
		destination: securedDestination,
		settings: ['add_lead', 'status_lead'],
	});
});

test('trigger rejects unauthenticated webhooks and redacts its secret from metadata', async () => {
	let statusCode;
	let responseBody;
	const rejectedContext = {
		getNodeParameter(name) {
			if (name === 'includeRequestMetadata') return true;
			throw new Error(`Unexpected parameter: ${name}`);
		},
		getCredentials: async () => ({ secret: webhookSecret }),
		getNode: () => fakeNode,
		getBodyData: () => ({ leads: { add: [{ id: '10' }] } }),
		getQueryData: () => ({ kommo_secret: 'wrong-secret' }),
		getHeaderData: () => ({}),
		getResponseObject: () => ({
			status(code) {
				statusCode = code;
				return this;
			},
			send(body) {
				responseBody = body;
				return this;
			},
		}),
		helpers: { returnJsonArray },
	};

	const rejected = await new KommoTrigger().webhook.call(rejectedContext);
	assert.equal(statusCode, 401);
	assert.equal(responseBody, 'Unauthorized');
	assert.deepEqual(rejected, { noWebhookResponse: true });

	const acceptedContext = {
		...rejectedContext,
		getQueryData: () => ({ kommo_secret: webhookSecret, source: 'kommo' }),
	};
	const accepted = await new KommoTrigger().webhook.call(acceptedContext);
	assert.deepEqual(accepted.workflowData[0][0].json.query, { source: 'kommo' });
});

test('trigger rejects webhook credentials shorter than 32 characters', async () => {
	const context = {
		getNodeParameter: () => false,
		getCredentials: async () => ({ secret: 'too-short' }),
		getNode: () => fakeNode,
		getBodyData: () => ({}),
		getQueryData: () => ({ kommo_secret: 'too-short' }),
	};

	await assert.rejects(new KommoTrigger().webhook.call(context), /at least 32 characters/);
});
