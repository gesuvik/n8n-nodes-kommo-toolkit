const assert = require('node:assert/strict');
const { test } = require('node:test');

const { execute: getLeads } = require('../dist/nodes/Kommo/V1/resources/leads/get/execute.js');
const {
	description: getLeadsDescription,
} = require('../dist/nodes/Kommo/V1/resources/leads/get/description.js');
const {
	execute: createTasks,
} = require('../dist/nodes/Kommo/V1/resources/tasks/create/execute.js');
const {
	execute: updateTasks,
} = require('../dist/nodes/Kommo/V1/resources/tasks/update/execute.js');
const {
	description: updateTasksDescription,
} = require('../dist/nodes/Kommo/V1/resources/tasks/update/description.js');
const {
	description: createNotesDescription,
} = require('../dist/nodes/Kommo/V1/resources/notes/create/description.js');
const {
	description: updateNotesDescription,
} = require('../dist/nodes/Kommo/V1/resources/notes/update/description.js');
const { execute: getNotes } = require('../dist/nodes/Kommo/V1/resources/notes/get/execute.js');
const {
	makeCustomFieldReqObject,
} = require('../dist/nodes/Kommo/V1/resources/_components/CustomFieldsDescription.js');
const {
	create: createCustomField,
	descriptions: customFieldDescriptions,
} = require('../dist/nodes/Kommo/V1/resources/customFields/index.js');
const { apiRequestAllItems } = require('../dist/nodes/Kommo/V1/transport/index.js');

const fakeNode = {
	name: 'Kommo Contract Test',
	type: 'kommo',
	typeVersion: 1,
	position: [0, 0],
};

function returnJsonArray(data) {
	return (Array.isArray(data) ? data : [data]).map((json) => ({ json }));
}

function executionContext(parameters, onRequest) {
	return {
		getNodeParameter: (name) => {
			if (name === 'authentication') return 'longLivedToken';
			if (Object.prototype.hasOwnProperty.call(parameters, name)) return parameters[name];
			throw new Error(`Unexpected parameter: ${name}`);
		},
		getCredentials: async () => ({ subdomain: 'example' }),
		getNode: () => fakeNode,
		helpers: {
			returnJsonArray,
			httpRequestWithAuthentication: async (_credentialType, options) => onRequest(options),
		},
	};
}

test('lead filters use pipeline_id and pipeline/status pairs required by Kommo', async () => {
	let request;
	const status = JSON.stringify({ pipeline_id: 10, status_id: 20 });
	const context = executionContext(
		{
			filter: { pipelines: [10], statuses: [status] },
			options: {},
			returnAll: false,
			page: 1,
			limit: 50,
		},
		async (options) => {
			request = options;
			return { _embedded: { leads: [] } };
		},
	);

	await getLeads.call(context, 0);
	assert.deepEqual(request.qs.filter, {
		pipeline_id: [10],
		statuses: [{ pipeline_id: 10, status_id: 20 }],
	});
	assert.equal(
		getLeadsDescription
			.find((property) => property.name === 'filter')
			.options.find((property) => property.name === 'statuses').typeOptions.loadOptionsMethod,
		'getLeadFilterStatuses',
	);
});

test('task update sends only selected fields and leaves absent values untouched', async () => {
	let request;
	const context = executionContext(
		{
			json: false,
			collection: { task: [{ id: 42, text: 'Only this changes' }] },
		},
		async (options) => {
			request = options;
			return { _embedded: { tasks: [{ id: 42 }] } };
		},
	);

	await updateTasks.call(context, 0);
	assert.deepEqual(request.body, [{ id: 42, text: 'Only this changes' }]);

	const fields = updateTasksDescription.find((property) => property.name === 'collection')
		.options[0].values;
	for (const field of fields.filter((field) => field.name !== 'id')) {
		assert.equal(field.default, undefined, `${field.name} must be opt-in during updates`);
	}
});

test('task completion requires and sends result text together with is_completed', async () => {
	const invalidContext = executionContext(
		{
			json: false,
			collection: { task: [{ id: 42, is_completed: true, resultText: '' }] },
		},
		async () => assert.fail('invalid task must not make a request'),
	);
	await assert.rejects(updateTasks.call(invalidContext, 0), /Result Text/);

	let request;
	const validContext = executionContext(
		{
			json: false,
			collection: { task: [{ id: 42, is_completed: true, resultText: 'Done' }] },
		},
		async (options) => {
			request = options;
			return {};
		},
	);
	await updateTasks.call(validContext, 0);
	assert.deepEqual(request.body, [{ id: 42, is_completed: true, result: { text: 'Done' } }]);
});

test('task creation rejects an empty deadline instead of sending Unix zero', async () => {
	const context = executionContext(
		{
			json: false,
			collection: { task: [{ text: 'No deadline', complete_till: '' }] },
		},
		async () => assert.fail('invalid task must not make a request'),
	);
	await assert.rejects(createTasks.call(context, 0), /Complete Till/);
});

test('call-note forms expose the entity ID and update forms also expose the note ID', () => {
	const createCallFields = createNotesDescription
		.find((property) => property.name === 'notes')
		.options.find((option) => option.name === 'call_in')
		.values.map((property) => property.name);
	const updateCallFields = updateNotesDescription
		.find((property) => property.name === 'notes')
		.options.find((option) => option.name === 'call_out')
		.values.map((property) => property.name);

	assert.ok(createCallFields.includes('entity_id'));
	assert.ok(updateCallFields.includes('entity_id'));
	assert.ok(updateCallFields.includes('id'));
});

test('notes requested by entity IDs put each ID in the API path', async () => {
	const requests = [];
	const context = executionContext(
		{
			entity_type: 'leads',
			filter: { entity_id: '123,456', id: '', note_type: [] },
			options: {},
			returnAll: false,
			page: 1,
			limit: 50,
		},
		async (options) => {
			requests.push(options);
			const entityId = Number(options.url.split('/').at(-2));
			return { _embedded: { notes: [{ id: entityId + 1000, entity_id: entityId }] } };
		},
	);

	const result = await getNotes.call(context, 0);
	assert.deepEqual(
		requests.map((request) => request.url),
		[
			'https://example.kommo.com/api/v4/leads/123/notes',
			'https://example.kommo.com/api/v4/leads/456/notes',
		],
	);
	assert.ok(requests.every((request) => !('entity_id' in (request.qs.filter ?? {}))));
	assert.deepEqual(
		result.map((item) => item.json.entity_id),
		[123, 456],
	);
});

test('custom fields preserve RFC-3339 dates and add a valid multitext enum', () => {
	const result = makeCustomFieldReqObject({
		custom_field: [
			{
				data: JSON.stringify({ id: 31, type: 'multitext' }),
				value: '+595981000000',
			},
			{
				data: JSON.stringify({ id: 32, type: 'date_time' }),
				value: '2026-08-11T12:30:00-03:00',
			},
		],
	});

	assert.deepEqual(result, [
		{ field_id: 31, values: [{ value: '+595981000000', enum_code: 'WORK' }] },
		{ field_id: 32, values: [{ value: '2026-08-11T12:30:00-03:00' }] },
	]);
});

test('custom-field definitions constrain field types by Kommo entity', async () => {
	const fieldType = customFieldDescriptions.find((property) => property.name === 'customFieldType');
	assert.deepEqual(
		fieldType.options.find((option) => option.value === 'multitext').displayOptions.show
			.customFieldEntityType,
		['contacts'],
	);
	assert.deepEqual(
		fieldType.options.find((option) => option.value === 'price').displayOptions.show
			.customFieldEntityType,
		['catalogs'],
	);

	const context = executionContext(
		{
			customFieldEntityType: 'leads',
			customFieldName: 'Invalid phone',
			customFieldType: 'multitext',
			customFieldAdditionalFields: {},
		},
		async () => assert.fail('invalid field type must not make a request'),
	);
	await assert.rejects(createCustomField.execute.call(context, 0), /not available for leads/);
});

test('empty paginated Kommo responses return an empty collection', async () => {
	const context = executionContext({}, async () => undefined);
	const result = await apiRequestAllItems.call(context, 'GET', 'leads', {}, {}, 'leads');
	assert.deepEqual(result, []);
});
