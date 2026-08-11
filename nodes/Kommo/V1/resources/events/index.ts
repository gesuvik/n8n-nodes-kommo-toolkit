import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { getTimestampFromDateString } from '../../helpers/getTimestampFromDateString';
import { apiRequest } from '../../transport';
import { extractEmbedded, getCollection, outputResponse } from '../_shared';

const resource = 'events';

function show(operation: string[]) {
	return { show: { resource: [resource], operation } };
}

const includeOptions = [
	{ name: 'Catalog Element Name', value: 'catalog_element_name' },
	{ name: 'Catalog Name', value: 'catalog_name' },
	{ name: 'Company Name', value: 'company_name' },
	{ name: 'Contact Name', value: 'contact_name' },
	{ name: 'Lead Name', value: 'lead_name' },
];

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get an event' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many events' },
			{ name: 'Get Types', value: 'getTypes', action: 'Get event types' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['get']),
	},
	{
		displayName: 'Include',
		name: 'eventWith',
		type: 'multiOptions',
		default: [],
		options: includeOptions,
		displayOptions: show(['get', 'getMany']),
	},
	{
		displayName: 'Filters',
		name: 'eventFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getMany']),
		options: [
			{
				displayName: 'Created After',
				name: 'createdFrom',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Created Before',
				name: 'createdTo',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Created by User IDs',
				name: 'createdBy',
				type: 'string',
				default: '',
				description: 'Up to 10 user IDs separated by commas',
			},
			{
				displayName: 'Entities',
				name: 'entities',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Company', value: 'company' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Task', value: 'task' },
				],
			},
			{
				displayName: 'Entity IDs',
				name: 'entityIds',
				type: 'string',
				default: '',
				description: 'Up to 10 IDs separated by commas; use with a single entity type',
			},
			{
				displayName: 'Event IDs',
				name: 'ids',
				type: 'string',
				default: '',
				description: 'Event IDs separated by commas',
			},
			{
				displayName: 'Types',
				name: 'types',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Company Added', value: 'company_added' },
					{ name: 'Contact Added', value: 'contact_added' },
					{ name: 'Custom Field Changed', value: 'custom_field_value_changed' },
					{ name: 'Entity Responsible Changed', value: 'entity_responsible_changed' },
					{ name: 'Entity Tag Added', value: 'entity_tag_added' },
					{ name: 'Entity Tag Deleted', value: 'entity_tag_deleted' },
					{ name: 'Incoming Chat Message', value: 'incoming_chat_message' },
					{ name: 'Lead Added', value: 'lead_added' },
					{ name: 'Lead Status Changed', value: 'lead_status_changed' },
					{ name: 'Outgoing Chat Message', value: 'outgoing_chat_message' },
					{ name: 'Task Added', value: 'task_added' },
					{ name: 'Task Completed', value: 'task_completed' },
				],
				description: 'Use an expression to pass other event type codes',
			},
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
	{
		displayName: 'Language',
		name: 'eventLanguage',
		type: 'options',
		default: 'en',
		options: [
			{ name: 'English', value: 'en' },
			{ name: 'Portuguese', value: 'pt' },
			{ name: 'Spanish', value: 'es' },
		],
		displayOptions: show(['getTypes']),
	},
];

function buildQuery(context: IExecuteFunctions, index: number): IDataObject {
	const filters = context.getNodeParameter('eventFilters', index, {}) as IDataObject & {
		createdFrom?: string;
		createdTo?: string;
		createdBy?: string;
		entities?: string[];
		entityIds?: string;
		ids?: string;
		types?: string[];
	};
	const withValues = context.getNodeParameter('eventWith', index, []) as string[];
	return clearNullableProps({
		with: withValues.join(','),
		filter: clearNullableProps({
			id: filters.ids,
			created_at: clearNullableProps({
				from: getTimestampFromDateString(filters.createdFrom),
				to: getTimestampFromDateString(filters.createdTo),
			}),
			created_by: filters.createdBy,
			entity: filters.entities?.join(','),
			entity_id: filters.entityIds,
			type: filters.types?.join(','),
		}),
	}) as IDataObject;
}

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		return getCollection.call(this, index, 'events', 'events', buildQuery(this, index));
	},
};

export const get = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const eventId = this.getNodeParameter('eventId', index) as string;
		const withValues = this.getNodeParameter('eventWith', index) as string[];
		const response = await apiRequest.call(
			this,
			'GET',
			`events/${encodeURIComponent(eventId)}`,
			{},
			withValues.length ? { with: withValues.join(',') } : {},
		);
		return outputResponse(this, response);
	},
};

export const getTypes = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const language = this.getNodeParameter('eventLanguage', index) as string;
		const response = await apiRequest.call(
			this,
			'GET',
			'events/types',
			{},
			{ language_code: language },
		);
		const types = extractEmbedded(response, 'events_types');
		return types.length ? this.helpers.returnJsonArray(types) : outputResponse(this, response);
	},
};
