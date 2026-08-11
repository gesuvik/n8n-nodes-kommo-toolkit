import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { apiRequest } from '../../transport';
import { deletionResult, extractEmbedded, outputResponse } from '../_shared';

const resource = 'pipelines';

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
			{ name: 'Create', value: 'create', action: 'Create a pipeline' },
			{ name: 'Delete', value: 'remove', action: 'Delete a pipeline' },
			{ name: 'Get', value: 'get', action: 'Get a pipeline' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many pipelines' },
			{ name: 'Update', value: 'update', action: 'Update a pipeline' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Pipeline ID',
		name: 'pipelineId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: show(['get', 'update', 'remove']),
	},
	{
		displayName: 'Name',
		name: 'pipelineName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Sort',
		name: 'pipelineSort',
		type: 'number',
		default: 0,
		displayOptions: show(['create']),
	},
	{
		displayName: 'Main Pipeline',
		name: 'pipelineIsMain',
		type: 'boolean',
		default: false,
		displayOptions: show(['create']),
	},
	{
		displayName: 'Incoming Leads Enabled',
		name: 'pipelineIsUnsortedOn',
		type: 'boolean',
		default: true,
		displayOptions: show(['create']),
	},
	{
		displayName: 'Update Fields',
		name: 'pipelineUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{
				displayName: 'Incoming Leads Enabled',
				name: 'is_unsorted_on',
				type: 'boolean',
				default: true,
			},
			{ displayName: 'Main Pipeline', name: 'is_main', type: 'boolean', default: false },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Sort', name: 'sort', type: 'number', default: 0 },
		],
	},
];

export const getMany = {
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
		const response = await apiRequest.call(this, 'GET', 'leads/pipelines');
		return this.helpers.returnJsonArray(extractEmbedded(response, 'pipelines'));
	},
};

export const get = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const pipelineId = this.getNodeParameter('pipelineId', index) as number;
		const response = await apiRequest.call(this, 'GET', `leads/pipelines/${pipelineId}`);
		return outputResponse(this, response);
	},
};

export const create = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const body = [
			{
				name: this.getNodeParameter('pipelineName', index) as string,
				sort: this.getNodeParameter('pipelineSort', index) as number,
				is_main: this.getNodeParameter('pipelineIsMain', index) as boolean,
				is_unsorted_on: this.getNodeParameter('pipelineIsUnsortedOn', index) as boolean,
			},
		];
		const response = await apiRequest.call(this, 'POST', 'leads/pipelines', body);
		return outputResponse(this, response);
	},
};

export const update = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const pipelineId = this.getNodeParameter('pipelineId', index) as number;
		const fields = clearNullableProps(
			this.getNodeParameter('pipelineUpdateFields', index) as IDataObject,
		);
		const response = await apiRequest.call(this, 'PATCH', `leads/pipelines/${pipelineId}`, fields);
		return outputResponse(this, response);
	},
};

export const remove = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const pipelineId = this.getNodeParameter('pipelineId', index) as number;
		await apiRequest.call(this, 'DELETE', `leads/pipelines/${pipelineId}`);
		return deletionResult(this, 'pipeline', pipelineId);
	},
};
