import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { stringToArray } from '../../helpers/stringToArray';
import { apiRequest } from '../../transport';
import { getCollection, outputResponse } from '../_shared';

const resource = 'salesbots';

function show(operation: string[]) {
	return { show: { resource: [resource], operation } };
}

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get a salesbot' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many salesbots' },
			{ name: 'Run', value: 'run', action: 'Run a salesbot' },
			{ name: 'Stop', value: 'stop', action: 'Stop a salesbot' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Salesbot ID',
		name: 'salesbotId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: show(['get', 'run', 'stop']),
	},
	{
		displayName: 'Entity Type',
		name: 'salesbotEntityType',
		type: 'options',
		default: 'leads',
		options: [
			{ name: 'Contact', value: 'contacts' },
			{ name: 'Lead', value: 'leads' },
		],
		displayOptions: show(['run']),
	},
	{
		displayName: 'Entity Type',
		name: 'salesbotStopEntityType',
		type: 'options',
		default: 'leads',
		options: [{ name: 'Lead', value: 'leads' }],
		displayOptions: show(['stop']),
	},
	{
		displayName: 'Entity ID',
		name: 'salesbotEntityId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: show(['run', 'stop']),
	},
	{
		displayName: 'Filters',
		name: 'salesbotFilters',
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
				description: 'IDs separated by commas',
			},
			{
				displayName: 'Functionality Types',
				name: 'types',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Greeting', value: 'greeting' },
					{ name: 'Marketing', value: 'marketing' },
					{ name: 'NPS', value: 'nps' },
					{ name: 'Regular', value: 'regular' },
				],
			},
		],
	},
	{
		displayName: 'Include Favorite State',
		name: 'salesbotWithFavorite',
		type: 'boolean',
		default: false,
		displayOptions: show(['getMany']),
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

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const filters = this.getNodeParameter('salesbotFilters', index) as {
			ids?: string;
			types?: string[];
		};
		const withFavorite = this.getNodeParameter('salesbotWithFavorite', index) as boolean;
		const query = clearNullableProps({
			with: withFavorite ? 'favorite' : undefined,
			filter: clearNullableProps({
				id: stringToArray(filters.ids).filter((value) => typeof value === 'number'),
				type_functionality: filters.types,
			}),
		}) as IDataObject;
		return getCollection.call(this, index, 'bots', 'bots', query);
	},
};

export const get = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const botId = this.getNodeParameter('salesbotId', index) as number;
		const response = await apiRequest.call(this, 'GET', `bots/${botId}`);
		return outputResponse(this, response);
	},
};

export const run = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const botId = this.getNodeParameter('salesbotId', index) as number;
		const entityId = this.getNodeParameter('salesbotEntityId', index) as number;
		const entityType = this.getNodeParameter('salesbotEntityType', index) as string;
		const response = await apiRequest.call(this, 'POST', `bots/${botId}/run`, {
			entity_id: entityId,
			entity_type: entityType,
		});
		return outputResponse(this, response, {
			success: true,
			action: 'run',
			bot_id: botId,
			entity_id: entityId,
		});
	},
};

export const stop = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const botId = this.getNodeParameter('salesbotId', index) as number;
		const entityId = this.getNodeParameter('salesbotEntityId', index) as number;
		const entityType = this.getNodeParameter('salesbotStopEntityType', index) as string;
		const response = await apiRequest.call(this, 'POST', `bots/${botId}/stop`, {
			entity_id: entityId,
			entity_type: entityType,
		});
		return outputResponse(this, response, {
			success: true,
			action: 'stop',
			bot_id: botId,
			entity_id: entityId,
		});
	},
};
