import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { parseOptionalJson } from '../../helpers/parseJson';
import { apiRequest } from '../../transport';
import { deletionResult, extractEmbedded, outputResponse } from '../_shared';

const resource = 'pipelineStages';

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
			{ name: 'Create', value: 'create', action: 'Create a pipeline stage' },
			{ name: 'Delete', value: 'remove', action: 'Delete a pipeline stage' },
			{ name: 'Get', value: 'get', action: 'Get a pipeline stage' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many pipeline stages' },
			{ name: 'Update', value: 'update', action: 'Update a pipeline stage' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'stagePipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		default: '',
		required: true,
		description:
			'Pipeline containing the stage. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: [resource] } },
	},
	{
		displayName: 'Stage ID',
		name: 'stageId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: show(['get', 'update', 'remove']),
	},
	{
		displayName: 'Include Descriptions',
		name: 'stageIncludeDescriptions',
		type: 'boolean',
		default: false,
		displayOptions: show(['get', 'getMany']),
	},
	{
		displayName: 'Name',
		name: 'stageName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['create']),
	},
	{
		displayName: 'Sort',
		name: 'stageSort',
		type: 'number',
		default: 0,
		displayOptions: show(['create']),
	},
	{
		displayName: 'Color',
		name: 'stageColor',
		type: 'color',
		default: '#fffeb2',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Descriptions JSON',
		name: 'stageDescriptionsJson',
		type: 'json',
		default: '',
		description:
			'Optional array such as [{"level":"newbie","description":"What to do in this stage"}]',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Update Fields',
		name: 'stageUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Color', name: 'color', type: 'color', default: '#fffeb2' },
			{
				displayName: 'Descriptions JSON',
				name: 'descriptionsJson',
				type: 'json',
				default: '',
			},
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Sort', name: 'sort', type: 'number', default: 0 },
		],
	},
];

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const pipelineId = this.getNodeParameter('stagePipelineId', index) as number;
		const includeDescriptions = this.getNodeParameter('stageIncludeDescriptions', index) as boolean;
		const response = await apiRequest.call(
			this,
			'GET',
			`leads/pipelines/${pipelineId}/statuses`,
			{},
			includeDescriptions ? { with: 'descriptions' } : {},
		);
		return this.helpers.returnJsonArray(extractEmbedded(response, 'statuses'));
	},
};

export const get = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const pipelineId = this.getNodeParameter('stagePipelineId', index) as number;
		const stageId = this.getNodeParameter('stageId', index) as number;
		const includeDescriptions = this.getNodeParameter('stageIncludeDescriptions', index) as boolean;
		const response = await apiRequest.call(
			this,
			'GET',
			`leads/pipelines/${pipelineId}/statuses/${stageId}`,
			{},
			includeDescriptions ? { with: 'descriptions' } : {},
		);
		return outputResponse(this, response);
	},
};

export const create = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const pipelineId = this.getNodeParameter('stagePipelineId', index) as number;
		const descriptions = parseOptionalJson(
			this.getNodeParameter('stageDescriptionsJson', index) as string,
			this.getNode(),
			index,
			'stage descriptions JSON',
		);
		const body = [
			{
				name: this.getNodeParameter('stageName', index) as string,
				sort: this.getNodeParameter('stageSort', index) as number,
				color: this.getNodeParameter('stageColor', index) as string,
				...(descriptions ? { descriptions } : {}),
			},
		];
		const response = await apiRequest.call(
			this,
			'POST',
			`leads/pipelines/${pipelineId}/statuses`,
			body,
		);
		return outputResponse(this, response);
	},
};

export const update = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const pipelineId = this.getNodeParameter('stagePipelineId', index) as number;
		const stageId = this.getNodeParameter('stageId', index) as number;
		const rawFields = this.getNodeParameter('stageUpdateFields', index) as IDataObject & {
			descriptionsJson?: string;
		};
		const descriptions = parseOptionalJson(
			rawFields.descriptionsJson,
			this.getNode(),
			index,
			'stage descriptions JSON',
		);
		const rest = { ...rawFields };
		delete rest.descriptionsJson;
		const body = clearNullableProps({ ...rest, ...(descriptions ? { descriptions } : {}) });
		const response = await apiRequest.call(
			this,
			'PATCH',
			`leads/pipelines/${pipelineId}/statuses/${stageId}`,
			body,
		);
		return outputResponse(this, response);
	},
};

export const remove = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const pipelineId = this.getNodeParameter('stagePipelineId', index) as number;
		const stageId = this.getNodeParameter('stageId', index) as number;
		await apiRequest.call(this, 'DELETE', `leads/pipelines/${pipelineId}/statuses/${stageId}`);
		return deletionResult(this, 'pipelineStage', stageId);
	},
};
