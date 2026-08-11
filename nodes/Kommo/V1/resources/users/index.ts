import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import { getCollection, outputResponse } from '../_shared';

const resource = 'users';

function show(operation: string[]) {
	return { show: { resource: [resource], operation } };
}

const withOptions = [
	{ name: 'Amojo ID', value: 'amojo_id' },
	{ name: 'Group', value: 'group' },
	{ name: 'Phone Number', value: 'phone_number' },
	{ name: 'Role', value: 'role' },
	{ name: 'User Rank', value: 'user_rank' },
	{ name: 'UUID', value: 'uuid' },
];

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get a user' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many users' },
		],
		default: 'getMany',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: show(['get']),
	},
	{
		displayName: 'Include',
		name: 'userWith',
		type: 'multiOptions',
		default: [],
		options: withOptions,
		displayOptions: show(['get', 'getMany']),
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

function getQuery(context: IExecuteFunctions, index: number): IDataObject {
	const withValues = context.getNodeParameter('userWith', index) as string[];
	return withValues.length ? { with: withValues.join(',') } : {};
}

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		return getCollection.call(this, index, 'users', 'users', getQuery(this, index));
	},
};

export const get = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const userId = this.getNodeParameter('userId', index) as number;
		const response = await apiRequest.call(
			this,
			'GET',
			`users/${userId}`,
			{},
			getQuery(this, index),
		);
		return outputResponse(this, response);
	},
};
