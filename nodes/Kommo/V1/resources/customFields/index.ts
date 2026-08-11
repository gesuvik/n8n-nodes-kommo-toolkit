import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { parseOptionalJson } from '../../helpers/parseJson';
import { apiRequest } from '../../transport';
import { deletionResult, getCollection, outputResponse } from '../_shared';

const resource = 'customFields';

function show(operation: string[]) {
	return { show: { resource: [resource], operation } };
}

const allEntities = ['contacts', 'leads', 'companies', 'catalogs'];
const cardEntities = ['contacts', 'leads', 'companies'];

function fieldType(
	name: string,
	value: string,
	entities: string[] = allEntities,
): INodePropertyOptions {
	return {
		name,
		value,
		displayOptions: { show: { customFieldEntityType: entities } },
	};
}

const fieldTypes: INodePropertyOptions[] = [
	fieldType('Address', 'smart_address', cardEntities),
	fieldType('Birthday', 'birthday', cardEntities),
	fieldType('Category', 'category', ['catalogs']),
	fieldType('Chained List', 'chained_list', ['leads']),
	{ name: 'Checkbox', value: 'checkbox' },
	{ name: 'Date', value: 'date' },
	{ name: 'Date and Time', value: 'date_time' },
	{ name: 'File', value: 'file' },
	fieldType('Legal Entity', 'legal_entity', cardEntities),
	fieldType('Linked Entity', 'linked_entity', ['catalogs']),
	{ name: 'Monetary', value: 'monetary' },
	{ name: 'Multiselect', value: 'multiselect' },
	fieldType('Multitext', 'multitext', ['contacts']),
	{ name: 'Number', value: 'numeric' },
	fieldType('Price', 'price', ['catalogs']),
	fieldType('Products', 'items', ['catalogs']),
	{ name: 'Radio Button', value: 'radiobutton' },
	{ name: 'Select', value: 'select' },
	{ name: 'Short Address', value: 'streetaddress' },
	{ name: 'Text', value: 'text' },
	{ name: 'Text Area', value: 'textarea' },
	{ name: 'URL', value: 'url' },
];

function isFieldTypeAvailable(entity: string, type: string): boolean {
	const option = fieldTypes.find((field) => field.value === type);
	if (!option) return false;
	const entities = option.displayOptions?.show?.customFieldEntityType ?? allEntities;
	return (entities as string[]).includes(entity);
}

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a custom field' },
			{ name: 'Delete', value: 'remove', action: 'Delete a custom field' },
			{ name: 'Get', value: 'get', action: 'Get a custom field' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many custom fields' },
			{ name: 'Update', value: 'update', action: 'Update a custom field' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Entity Type',
		name: 'customFieldEntityType',
		type: 'options',
		default: 'leads',
		options: [
			{ name: 'Company', value: 'companies' },
			{ name: 'Contact', value: 'contacts' },
			{ name: 'Lead', value: 'leads' },
			{ name: 'List', value: 'catalogs' },
		],
		displayOptions: { show: { resource: [resource] } },
	},
	{
		displayName: 'List Name or ID',
		name: 'customFieldCatalogId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCatalogs' },
		default: '',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: { show: { resource: [resource], customFieldEntityType: ['catalogs'] } },
	},
	{
		displayName: 'Field ID',
		name: 'customFieldId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: show(['get', 'update', 'remove']),
	},
	{
		displayName: 'Name',
		name: 'customFieldName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['create']),
	},
	{
		displayName: 'Field Type',
		name: 'customFieldType',
		type: 'options',
		default: 'text',
		options: fieldTypes,
		displayOptions: show(['create']),
	},
	{
		displayName: 'Additional Fields',
		name: 'customFieldAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{ displayName: 'Code', name: 'code', type: 'string', default: '' },
			{ displayName: 'Currency', name: 'currency', type: 'string', default: '' },
			{
				displayName: 'Enums JSON',
				name: 'enumsJson',
				type: 'json',
				default: '',
				description: 'Array of values for select, multiselect, or radio button fields',
			},
			{ displayName: 'Field Group ID', name: 'group_id', type: 'string', default: '' },
			{
				displayName: 'Only Editable via API',
				name: 'is_api_only',
				type: 'boolean',
				default: false,
			},
			{ displayName: 'Required', name: 'is_required', type: 'boolean', default: false },
			{ displayName: 'Sort', name: 'sort', type: 'number', default: 0 },
			{ displayName: 'Visible', name: 'is_visible', type: 'boolean', default: true },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'customFieldUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Code', name: 'code', type: 'string', default: '' },
			{ displayName: 'Currency', name: 'currency', type: 'string', default: '' },
			{ displayName: 'Enums JSON', name: 'enumsJson', type: 'json', default: '' },
			{ displayName: 'Field Group ID', name: 'group_id', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Only Editable via API',
				name: 'is_api_only',
				type: 'boolean',
				default: false,
			},
			{ displayName: 'Required', name: 'is_required', type: 'boolean', default: false },
			{ displayName: 'Sort', name: 'sort', type: 'number', default: 0 },
			{ displayName: 'Visible', name: 'is_visible', type: 'boolean', default: true },
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: show(['getMany']),
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: [resource], operation: ['getMany'], returnAll: [false] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		default: 50,
		typeOptions: { minValue: 1, maxValue: 250 },
		displayOptions: { show: { resource: [resource], operation: ['getMany'], returnAll: [false] } },
	},
];

function getEndpoint(context: IExecuteFunctions, index: number): string {
	const entity = context.getNodeParameter('customFieldEntityType', index) as string;
	if (entity !== 'catalogs') return `${entity}/custom_fields`;
	const catalogId = context.getNodeParameter('customFieldCatalogId', index) as number;
	return `catalogs/${catalogId}/custom_fields`;
}

function prepareFields(
	context: IExecuteFunctions,
	index: number,
	parameterName: string,
): IDataObject | undefined {
	const rawFields = context.getNodeParameter(parameterName, index, {}) as IDataObject & {
		enumsJson?: string;
	};
	const enums = parseOptionalJson(
		rawFields.enumsJson,
		context.getNode(),
		index,
		'custom field enums JSON',
	);
	const fields = { ...rawFields };
	delete fields.enumsJson;
	return clearNullableProps({ ...fields, enums });
}

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		return getCollection.call(this, index, getEndpoint(this, index), 'custom_fields');
	},
};

export const get = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const fieldId = this.getNodeParameter('customFieldId', index) as number;
		const response = await apiRequest.call(this, 'GET', `${getEndpoint(this, index)}/${fieldId}`);
		return outputResponse(this, response);
	},
};

export const create = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entity = this.getNodeParameter('customFieldEntityType', index) as string;
		const type = this.getNodeParameter('customFieldType', index) as string;
		if (!isFieldTypeAvailable(entity, type)) {
			throw new NodeOperationError(
				this.getNode(),
				`Custom field type ${type} is not available for ${entity}`,
			);
		}
		const body = clearNullableProps({
			name: this.getNodeParameter('customFieldName', index) as string,
			type,
			...prepareFields(this, index, 'customFieldAdditionalFields'),
		});
		const response = await apiRequest.call(
			this,
			'POST',
			getEndpoint(this, index),
			body ? [body] : [],
		);
		return outputResponse(this, response);
	},
};

export const update = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const fieldId = this.getNodeParameter('customFieldId', index) as number;
		const entity = this.getNodeParameter('customFieldEntityType', index) as string;
		const endpoint = getEndpoint(this, index);
		const fields = prepareFields(this, index, 'customFieldUpdateFields');
		const response = await apiRequest.call(
			this,
			'PATCH',
			entity === 'catalogs' ? endpoint : `${endpoint}/${fieldId}`,
			entity === 'catalogs' ? [{ id: fieldId, ...fields }] : fields,
		);
		return outputResponse(this, response);
	},
};

export const remove = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const fieldId = this.getNodeParameter('customFieldId', index) as number;
		await apiRequest.call(this, 'DELETE', `${getEndpoint(this, index)}/${fieldId}`);
		return deletionResult(this, 'customField', fieldId);
	},
};
