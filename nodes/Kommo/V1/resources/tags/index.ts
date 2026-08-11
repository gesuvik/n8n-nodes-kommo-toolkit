import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { stringToArray } from '../../helpers/stringToArray';
import { apiRequest } from '../../transport';
import { getCollection, outputResponse } from '../_shared';

const resource = 'tags';

function show(operation: string[]) {
	return { show: { resource: [resource], operation } };
}

const entityType: INodeProperties = {
	displayName: 'Entity Type',
	name: 'tagEntityType',
	type: 'options',
	default: 'leads',
	options: [
		{ name: 'Company', value: 'companies' },
		{ name: 'Contact', value: 'contacts' },
		{ name: 'Lead', value: 'leads' },
	],
	displayOptions: { show: { resource: [resource] } },
};

const tagsCollection: INodeProperties = {
	displayName: 'Tags',
	name: 'tagCollection',
	type: 'fixedCollection',
	placeholder: 'Add Tag',
	default: {},
	typeOptions: { multipleValues: true },
	options: [
		{
			displayName: 'Tag',
			name: 'tag',
			values: [
				{ displayName: 'ID', name: 'id', type: 'number', default: 0 },
				{ displayName: 'Name', name: 'name', type: 'string', default: '' },
				{
					displayName: 'Color',
					name: 'color',
					type: 'color',
					default: '',
					description: 'Color is supported for lead tags',
				},
			],
		},
	],
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create tags' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many tags' },
			{ name: 'Replace on Entity', value: 'replaceOnEntity', action: 'Replace tags on an entity' },
		],
		default: 'getMany',
	},
	entityType,
	{
		displayName: 'Filters',
		name: 'tagFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getMany']),
		options: [
			{
				displayName: 'IDs',
				name: 'ids',
				type: 'string',
				default: '',
				description: 'Tag IDs separated by commas',
			},
			{ displayName: 'Exact Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Query', name: 'query', type: 'string', default: '' },
		],
	},
	{
		...tagsCollection,
		name: 'tagCreateCollection',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Entity ID',
		name: 'tagEntityId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: show(['replaceOnEntity']),
	},
	{
		displayName: 'Remove All Tags',
		name: 'tagRemoveAll',
		type: 'boolean',
		default: false,
		description: 'Whether to detach every existing tag from the entity',
		displayOptions: show(['replaceOnEntity']),
	},
	{
		...tagsCollection,
		name: 'tagReplaceCollection',
		displayOptions: {
			show: { resource: [resource], operation: ['replaceOnEntity'], tagRemoveAll: [false] },
		},
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

function readTags(context: IExecuteFunctions, index: number, parameterName: string): IDataObject[] {
	const collection = context.getNodeParameter(parameterName, index, {}) as {
		tag?: Array<{ id?: number; name?: string; color?: string }>;
	};
	return (collection.tag ?? [])
		.map((tag) => clearNullableProps({ id: tag.id || undefined, name: tag.name, color: tag.color }))
		.filter((tag): tag is IDataObject => Boolean(tag));
}

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entity = this.getNodeParameter('tagEntityType', index) as string;
		const filters = this.getNodeParameter('tagFilters', index, {}) as {
			ids?: string;
			name?: string;
			query?: string;
		};
		const query = clearNullableProps({
			query: filters.query,
			filter: clearNullableProps({
				id: stringToArray(filters.ids).filter((value) => typeof value === 'number'),
				name: filters.name,
			}),
		}) as IDataObject;
		return getCollection.call(this, index, `${entity}/tags`, 'tags', query);
	},
};

export const create = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entity = this.getNodeParameter('tagEntityType', index) as string;
		const tags = readTags(this, index, 'tagCreateCollection')
			.map((tag) => clearNullableProps({ name: tag.name, color: tag.color }))
			.filter((tag): tag is IDataObject => Boolean(tag?.name));
		if (!tags.length) {
			throw new NodeOperationError(this.getNode(), 'Add at least one tag with a name', {
				itemIndex: index,
			});
		}
		const response = await apiRequest.call(this, 'POST', `${entity}/tags`, tags);
		return outputResponse(this, response);
	},
};

export const replaceOnEntity = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entity = this.getNodeParameter('tagEntityType', index) as string;
		const entityId = this.getNodeParameter('tagEntityId', index) as number;
		const removeAll = this.getNodeParameter('tagRemoveAll', index) as boolean;
		const tags = readTags(this, index, 'tagReplaceCollection')
			.map((tag) => clearNullableProps({ id: tag.id, name: tag.name }))
			.filter((tag): tag is IDataObject => Boolean(tag));
		const response = await apiRequest.call(this, 'PATCH', entity, [
			{
				id: entityId,
				_embedded: {
					tags: removeAll ? null : tags,
				},
			},
		]);
		return outputResponse(this, response);
	},
};
