const assert = require('node:assert/strict');
const { test } = require('node:test');

const { Kommo } = require('../dist/nodes/Kommo/Kommo.node.js');
const { KommoApi, normalizeApiEndpoint } = require('../dist/nodes/Kommo/KommoApi.node.js');
const { KommoBulk } = require('../dist/nodes/Kommo/KommoBulk.node.js');
const { KommoTrigger } = require('../dist/nodes/Kommo/KommoTrigger.node.js');

const fakeNode = {
	name: 'Kommo Toolkit Test',
	type: 'kommo',
	typeVersion: 1,
	position: [0, 0],
};

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
});

test('advanced API endpoint normalization accepts relative paths and rejects URL injection', () => {
	assert.equal(normalizeApiEndpoint(fakeNode, '/api/v4/leads/42'), 'leads/42');
	for (const endpoint of [
		'https://evil.example/leads',
		'../account',
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

test('trigger registers and removes its own Kommo webhook', async () => {
	const requests = [];
	const destination = 'https://n8n.example/webhook/kommo';
	let registered = false;
	const context = {
		getNodeWebhookUrl: () => destination,
		getNodeParameter(name) {
			if (name === 'events') return ['add_lead', 'status_lead'];
			if (name === 'authentication') return 'longLivedToken';
			throw new Error(`Unexpected parameter: ${name}`);
		},
		getCredentials: async () => ({ subdomain: 'example' }),
		getNode: () => fakeNode,
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, options) => {
				requests.push(options);
				if (options.method === 'GET') {
					return { _embedded: { webhooks: registered ? [{ destination }] : [] } };
				}
				registered = options.method === 'POST';
				return { success: true };
			},
		},
	};
	const methods = new KommoTrigger().webhookMethods.default;

	assert.equal(await methods.checkExists.call(context), false);
	assert.equal(await methods.create.call(context), true);
	assert.equal(await methods.checkExists.call(context), true);
	assert.equal(await methods.delete.call(context), true);
	assert.equal(registered, false);
	assert.deepEqual(
		requests.map((request) => request.method),
		['GET', 'POST', 'GET', 'GET', 'DELETE'],
	);
	assert.deepEqual(requests[1].body, {
		destination,
		settings: ['add_lead', 'status_lead'],
	});
});
