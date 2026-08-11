const assert = require('node:assert/strict');
const { test } = require('node:test');

const transport = require('../dist/nodes/Kommo/V1/transport/index.js');
const { router } = require('../dist/nodes/Kommo/V1/resources/router.js');
const {
	execute: createLeads,
} = require('../dist/nodes/Kommo/V1/resources/leads/create/execute.js');
const {
	update: updateCustomField,
} = require('../dist/nodes/Kommo/V1/resources/customFields/index.js');
const { replaceOnEntity } = require('../dist/nodes/Kommo/V1/resources/tags/index.js');

function makeContext() {
	const parameterIndexes = [];
	let activeIndex = 0;

	return {
		parameterIndexes,
		get activeIndex() {
			return activeIndex;
		},
		getInputData: () => [{ json: { input: 0 } }, { json: { input: 1 } }],
		getNodeParameter(name, index) {
			parameterIndexes.push({ name, index });
			activeIndex = index;
			if (name === 'resource') return 'account';
			if (name === 'operation') return 'getInfo';
			if (name === 'with') return [];
			throw new Error(`Unexpected parameter: ${name}`);
		},
		continueOnFail: () => true,
		getNode: () => ({ name: 'Kommo', type: 'kommo', typeVersion: 1, position: [0, 0] }),
		helpers: {
			returnJsonArray(data) {
				return (Array.isArray(data) ? data : [data]).map((json) => ({ json }));
			},
			constructExecutionMetaData(items, { itemData }) {
				return items.map((item) => ({ ...item, pairedItem: itemData }));
			},
		},
	};
}

test('router uses each input index, avoids json.json nesting, and preserves failed input', async () => {
	const context = makeContext();
	const originalApiRequest = transport.apiRequest;
	transport.apiRequest = async () => {
		if (context.activeIndex === 1) throw new Error('second item failed');
		return { observedIndex: context.activeIndex };
	};

	try {
		const [result] = await router.call(context);

		assert.deepEqual(result[0], {
			json: { observedIndex: 0 },
			pairedItem: { item: 0 },
		});
		assert.equal(result[0].json.json, undefined);
		assert.equal(result[1].json.input, 1);
		assert.equal(result[1].pairedItem.item, 1);
		assert.match(result[1].error.message, /second item failed/);
		assert.deepEqual(
			context.parameterIndexes.map(({ index }) => index),
			[0, 0, 0, 1, 1, 1],
		);
	} finally {
		transport.apiRequest = originalApiRequest;
	}
});

test('lead creation serializes a source as the Kommo API object shape', async () => {
	const indexes = [];
	let requestBody;
	const originalApiRequest = transport.apiRequest;
	transport.apiRequest = async (_method, _endpoint, body) => {
		requestBody = body;
		return { accepted: true };
	};
	const context = {
		getNodeParameter(name, index) {
			indexes.push(index);
			if (name === 'json') return false;
			if (name === 'collection') {
				return {
					lead: [
						{
							name: 'Lead with source',
							_embedded: {
								source: [{ external_id: 'website-form', type: 'widget' }],
							},
						},
					],
				};
			}
			throw new Error(`Unexpected parameter: ${name}`);
		},
		helpers: {
			returnJsonArray(data) {
				return (Array.isArray(data) ? data : [data]).map((json) => ({ json }));
			},
		},
	};

	try {
		await createLeads.call(context, 2);
		assert.deepEqual(requestBody[0]._embedded.source, {
			external_id: 'website-form',
			type: 'widget',
		});
		assert.deepEqual(indexes, [2, 2]);
	} finally {
		transport.apiRequest = originalApiRequest;
	}
});

test('catalog custom-field update uses the collection endpoint and embeds its field ID', async () => {
	let request;
	const originalApiRequest = transport.apiRequest;
	transport.apiRequest = async (method, endpoint, body) => {
		request = { method, endpoint, body };
		return { updated: true };
	};
	const parameters = {
		customFieldId: 321,
		customFieldEntityType: 'catalogs',
		customFieldCatalogId: 55,
		customFieldUpdateFields: { name: 'Updated field', enumsJson: '' },
	};
	const context = {
		getNodeParameter: (name) => parameters[name],
		getNode: () => ({ name: 'Kommo', type: 'kommo', typeVersion: 1, position: [0, 0] }),
		helpers: {
			returnJsonArray(data) {
				return (Array.isArray(data) ? data : [data]).map((json) => ({ json }));
			},
		},
	};

	try {
		await updateCustomField.execute.call(context, 0);
		assert.deepEqual(request, {
			method: 'PATCH',
			endpoint: 'catalogs/55/custom_fields',
			body: [{ id: 321, name: 'Updated field' }],
		});
	} finally {
		transport.apiRequest = originalApiRequest;
	}
});

test('tag replacement updates the entity collection with the target ID in an array', async () => {
	let request;
	const originalApiRequest = transport.apiRequest;
	transport.apiRequest = async (method, endpoint, body) => {
		request = { method, endpoint, body };
		return { updated: true };
	};
	const parameters = {
		tagEntityType: 'leads',
		tagEntityId: 99,
		tagRemoveAll: false,
		tagReplaceCollection: {
			tag: [
				{ id: 7, name: '', color: '#ffffff' },
				{ id: 0, name: 'VIP', color: '#000000' },
			],
		},
	};
	const context = {
		getNodeParameter: (name) => parameters[name],
		helpers: {
			returnJsonArray(data) {
				return (Array.isArray(data) ? data : [data]).map((json) => ({ json }));
			},
		},
	};

	try {
		await replaceOnEntity.execute.call(context, 0);
		assert.deepEqual(request, {
			method: 'PATCH',
			endpoint: 'leads',
			body: [
				{
					id: 99,
					_embedded: { tags: [{ id: 7 }, { name: 'VIP' }] },
				},
			],
		});
	} finally {
		transport.apiRequest = originalApiRequest;
	}
});
