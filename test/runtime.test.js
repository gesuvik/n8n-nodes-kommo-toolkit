const assert = require('node:assert/strict');
const { test } = require('node:test');

const { Kommo } = require('../dist/nodes/Kommo/Kommo.node.js');
const { cacheOptionsRequest } = require('../dist/nodes/Kommo/V1/helpers/cacheRequest.js');
const { apiRequest } = require('../dist/nodes/Kommo/V1/transport/index.js');

test('Kommo loads without depending on VersionedNodeType', () => {
	const node = new Kommo();
	assert.equal(node.description.name, 'kommo');
	assert.equal(node.description.version, 1);
	assert.equal(typeof node.execute, 'function');
});

test('load-options cache is deduplicated and scoped to node parameters', async () => {
	let calls = 0;
	const load = cacheOptionsRequest(async function load() {
		calls += 1;
		return [{ name: `Call ${calls}`, value: calls }];
	});
	const nodeA = { id: 'a', credentials: { kommo: { id: 'one' } }, parameters: { catalog_id: 1 } };
	const nodeWithOtherCredentials = {
		id: 'a',
		credentials: { kommo: { id: 'two' } },
		parameters: { catalog_id: 1 },
	};
	const nodeB = { id: 'b', credentials: { kommo: { id: 'one' } }, parameters: { catalog_id: 1 } };
	const contextA = { getNode: () => nodeA };
	const otherCredentialsContext = { getNode: () => nodeWithOtherCredentials };
	const contextB = { getNode: () => nodeB };

	const [first, duplicate] = await Promise.all([load.call(contextA), load.call(contextA)]);
	const otherCredentials = await load.call(otherCredentialsContext);
	const otherNode = await load.call(contextB);
	nodeA.parameters.catalog_id = 2;
	const changedParameter = await load.call(contextA);

	assert.deepEqual(first, duplicate);
	assert.equal(otherCredentials[0].value, 2);
	assert.equal(otherNode[0].value, 3);
	assert.equal(changedParameter[0].value, 4);
	assert.equal(calls, 4);
});

test('transport rejects unsafe subdomains before making a request', async () => {
	let requested = false;
	const context = {
		getNodeParameter: () => 'longLivedToken',
		getCredentials: async () => ({ subdomain: 'example.com/path' }),
		getNode: () => ({ name: 'Kommo', type: 'kommo', typeVersion: 1, position: [0, 0] }),
		helpers: {
			httpRequestWithAuthentication: async () => {
				requested = true;
			},
		},
	};

	await assert.rejects(() => apiRequest.call(context, 'GET', 'account'), /Invalid Kommo/);
	assert.equal(requested, false);
});
