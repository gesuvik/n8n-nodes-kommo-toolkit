import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { parseOptionalJson } from '../../helpers/parseJson';
import { stringToArray } from '../../helpers/stringToArray';
import { apiRequest } from '../../transport';
import { deletionResult, extractEmbedded, outputResponse } from '../_shared';

const resource = 'sources';

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
			{ name: 'Create', value: 'create', action: 'Create a source' },
			{ name: 'Delete', value: 'remove', action: 'Delete a source' },
			{ name: 'Get', value: 'get', action: 'Get a source' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many sources' },
			{ name: 'Update', value: 'update', action: 'Update a source' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Source ID',
		name: 'sourceId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: show(['get', 'update', 'remove']),
	},
	{
		displayName: 'External IDs',
		name: 'sourceExternalIds',
		type: 'string',
		default: '',
		description: 'External source IDs separated by commas',
		displayOptions: show(['getMany']),
	},
	{
		displayName: 'Name',
		name: 'sourceName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['create']),
	},
	{
		displayName: 'External ID',
		name: 'sourceExternalId',
		type: 'string',
		default: '',
		required: true,
		description: 'Unique identifier controlled by your integration',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Pipeline Name or ID',
		name: 'sourcePipelineId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		default: '',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Default Source',
		name: 'sourceDefault',
		type: 'boolean',
		default: false,
		displayOptions: show(['create']),
	},
	{
		displayName: 'Origin Code',
		name: 'sourceOriginCode',
		type: 'string',
		default: '',
		description: 'Optional main chat channel code, up to 20 characters',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Services JSON',
		name: 'sourceServicesJson',
		type: 'json',
		default: '',
		description: 'Optional array of service settings, including WhatsApp/WABA settings',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Update Fields',
		name: 'sourceUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Default Source', name: 'default', type: 'boolean', default: false },
			{ displayName: 'External ID', name: 'external_id', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Origin Code', name: 'origin_code', type: 'string', default: '' },
			{ displayName: 'Pipeline ID', name: 'pipeline_id', type: 'number', default: 0 },
			{ displayName: 'Services JSON', name: 'servicesJson', type: 'json', default: '' },
		],
	},
];

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const externalIds = stringToArray(
			this.getNodeParameter('sourceExternalIds', index) as string,
		).map(String);
		const response = await apiRequest.call(
			this,
			'GET',
			'sources',
			{},
			externalIds.length ? { filter: { external_id: externalIds } } : {},
		);
		return this.helpers.returnJsonArray(extractEmbedded(response, 'sources'));
	},
};

export const get = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const sourceId = this.getNodeParameter('sourceId', index) as number;
		const response = await apiRequest.call(this, 'GET', `sources/${sourceId}`);
		return outputResponse(this, response);
	},
};

export const create = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const services = parseOptionalJson(
			this.getNodeParameter('sourceServicesJson', index) as string,
			this.getNode(),
			index,
			'source services JSON',
		);
		const source = clearNullableProps({
			name: this.getNodeParameter('sourceName', index) as string,
			external_id: this.getNodeParameter('sourceExternalId', index) as string,
			pipeline_id: this.getNodeParameter('sourcePipelineId', index) as number,
			default: this.getNodeParameter('sourceDefault', index) as boolean,
			origin_code: this.getNodeParameter('sourceOriginCode', index) as string,
			services,
		});
		const response = await apiRequest.call(this, 'POST', 'sources', source ? [source] : []);
		return outputResponse(this, response);
	},
};

export const update = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const sourceId = this.getNodeParameter('sourceId', index) as number;
		const rawFields = this.getNodeParameter('sourceUpdateFields', index) as IDataObject & {
			servicesJson?: string;
		};
		const services = parseOptionalJson(
			rawFields.servicesJson,
			this.getNode(),
			index,
			'source services JSON',
		);
		const fields = { ...rawFields };
		delete fields.servicesJson;
		const body = clearNullableProps({ ...fields, services });
		const response = await apiRequest.call(this, 'PATCH', `sources/${sourceId}`, body);
		return outputResponse(this, response);
	},
};

export const remove = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const sourceId = this.getNodeParameter('sourceId', index) as number;
		await apiRequest.call(this, 'DELETE', `sources/${sourceId}`);
		return deletionResult(this, 'source', sourceId);
	},
};
