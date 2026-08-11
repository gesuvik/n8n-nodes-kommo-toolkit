const assert = require('node:assert/strict');
const { test } = require('node:test');

const { clearNullableProps } = require('../dist/nodes/Kommo/V1/helpers/clearNullableProps.js');
const {
	getTimestampFromDateString,
} = require('../dist/nodes/Kommo/V1/helpers/getTimestampFromDateString.js');
const { isNumber } = require('../dist/nodes/Kommo/V1/helpers/isNumber.js');
const { toNumberOrUndefined } = require('../dist/nodes/Kommo/V1/helpers/toNumberOrUndefined.js');
const {
	makeCustomFieldReqObject,
} = require('../dist/nodes/Kommo/V1/resources/_components/CustomFieldsDescription.js');

test('clearNullableProps preserves arrays, zero, and false while removing empty values', () => {
	const result = clearNullableProps({
		zero: 0,
		falseValue: false,
		empty: '',
		nullValue: null,
		notANumber: Number.NaN,
		nested: { empty: undefined, name: 'Kommo' },
		values: [{ id: 1, empty: '' }, null, 0, false, ''],
	});

	assert.deepEqual(result, {
		zero: 0,
		falseValue: false,
		nested: { name: 'Kommo' },
		values: [{ id: 1 }, 0, false],
	});
});

test('custom fields skip blank entries and merge repeated fields', () => {
	const result = makeCustomFieldReqObject({
		custom_field: [
			{ data: '', value: '' },
			{ data: JSON.stringify({ id: 1, type: 'text' }), value: '' },
			{ data: JSON.stringify({ id: 1, type: 'text' }), value: 'first' },
			{ data: JSON.stringify({ id: 2, type: 'select' }), value: '001' },
			{ data: JSON.stringify({ id: 1, type: 'text' }), value: 'second' },
		],
	});

	assert.deepEqual(result, [
		{
			field_id: 1,
			values: [
				{ value: 'first', enum_id: undefined, enum_code: undefined },
				{ value: 'second', enum_id: undefined, enum_code: undefined },
			],
		},
		{
			field_id: 2,
			values: [{ value: undefined, enum_id: 1, enum_code: undefined }],
		},
	]);
});

test('number and timestamp helpers reject invalid values without corrupting payloads', () => {
	assert.equal(isNumber('001'), true);
	assert.equal(isNumber('1.25'), true);
	assert.equal(isNumber(''), false);
	assert.equal(toNumberOrUndefined(''), undefined);
	assert.equal(toNumberOrUndefined('12'), 12);
	assert.equal(toNumberOrUndefined('not-a-number'), undefined);
	assert.equal(getTimestampFromDateString('invalid date'), undefined);
	assert.equal(getTimestampFromDateString('1970-01-01T00:00:01.999Z'), 1);
});
