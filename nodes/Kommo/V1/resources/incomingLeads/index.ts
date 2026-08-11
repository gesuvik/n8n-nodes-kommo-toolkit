import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { getTimestampFromDateString } from '../../helpers/getTimestampFromDateString';
import { parseJson } from '../../helpers/parseJson';
import { stringToArray } from '../../helpers/stringToArray';
import { apiRequest } from '../../transport';
import { getCollection, outputResponse } from '../_shared';

const resource = 'incomingLeads';

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
			{ name: 'Accept', value: 'accept', action: 'Accept an incoming lead' },
			{ name: 'Add Call', value: 'addCall', action: 'Add incoming call leads' },
			{ name: 'Add Form', value: 'addForm', action: 'Add incoming form leads' },
			{ name: 'Decline', value: 'decline', action: 'Decline an incoming lead' },
			{ name: 'Get', value: 'get', action: 'Get an incoming lead' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many incoming leads' },
			{ name: 'Get Summary', value: 'getSummary', action: 'Get incoming leads summary' },
			{ name: 'Link', value: 'link', action: 'Link an incoming lead' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Incoming Lead UID',
		name: 'incomingLeadUid',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['get', 'accept', 'decline', 'link']),
	},
	{
		displayName: 'User Name or ID',
		name: 'incomingLeadUserId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getActiveUsers' },
		default: '',
		required: true,
		description:
			'User performing the action. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: show(['accept', 'decline', 'link']),
	},
	{
		displayName: 'Destination Status Name or ID',
		name: 'incomingLeadStatusId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStatusesWithoutUnsorted' },
		default: '',
		required: true,
		description:
			'Stage used after accepting the incoming lead. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: show(['accept']),
	},
	{
		displayName: 'Link Object JSON',
		name: 'incomingLeadLinkJson',
		type: 'json',
		default: '{"entity_id":0,"entity_type":"leads"}',
		description: 'Kommo link object describing the existing lead/contact/company connection',
		displayOptions: show(['link']),
	},
	{
		displayName: 'Incoming Leads JSON',
		name: 'incomingLeadsJson',
		type: 'json',
		default: '[]',
		required: true,
		description: 'Array of incoming lead objects including source_uid, source_name and metadata',
		displayOptions: show(['addForm', 'addCall']),
	},
	{
		displayName: 'Filters',
		name: 'incomingLeadFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getMany']),
		options: [
			{
				displayName: 'Categories',
				name: 'categories',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Calls', value: 'sip' },
					{ name: 'Chats', value: 'chats' },
					{ name: 'Forms', value: 'forms' },
					{ name: 'Mail', value: 'mail' },
				],
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipelineId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
			},
			{
				displayName: 'UIDs',
				name: 'uids',
				type: 'string',
				default: '',
				description: 'UIDs separated by commas',
			},
		],
	},
	{
		displayName: 'Sort by Creation Time',
		name: 'incomingLeadSort',
		type: 'options',
		default: 'desc',
		options: [
			{ name: 'Ascending', value: 'asc' },
			{ name: 'Descending', value: 'desc' },
		],
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
	{
		displayName: 'Summary Filters',
		name: 'incomingLeadSummaryFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getSummary']),
		options: [
			{ displayName: 'Created After', name: 'createdFrom', type: 'dateTime', default: '' },
			{ displayName: 'Created Before', name: 'createdTo', type: 'dateTime', default: '' },
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipelineId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
			},
			{
				displayName: 'UIDs',
				name: 'uids',
				type: 'string',
				default: '',
				description: 'UIDs separated by commas',
			},
		],
	},
];

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const filters = this.getNodeParameter('incomingLeadFilters', index) as {
			categories?: string[];
			pipelineId?: number;
			uids?: string;
		};
		const sort = this.getNodeParameter('incomingLeadSort', index) as string;
		const query = clearNullableProps({
			filter: clearNullableProps({
				uid: stringToArray(filters.uids).map(String),
				category: filters.categories,
				pipeline_id: filters.pipelineId,
			}),
			order: { created_at: sort },
		}) as IDataObject;
		return getCollection.call(this, index, 'leads/unsorted', 'unsorted', query);
	},
};

export const get = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const uid = this.getNodeParameter('incomingLeadUid', index) as string;
		const response = await apiRequest.call(
			this,
			'GET',
			`leads/unsorted/${encodeURIComponent(uid)}`,
		);
		return outputResponse(this, response);
	},
};

export const addForm = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const body = parseJson(
			this.getNodeParameter('incomingLeadsJson', index) as string,
			this.getNode(),
			index,
			'incoming leads JSON',
		);
		const response = await apiRequest.call(this, 'POST', 'leads/unsorted/forms', body);
		return outputResponse(this, response);
	},
};

export const addCall = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const body = parseJson(
			this.getNodeParameter('incomingLeadsJson', index) as string,
			this.getNode(),
			index,
			'incoming leads JSON',
		);
		const response = await apiRequest.call(this, 'POST', 'leads/unsorted/sip', body);
		return outputResponse(this, response);
	},
};

export const accept = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const uid = this.getNodeParameter('incomingLeadUid', index) as string;
		const response = await apiRequest.call(
			this,
			'POST',
			`leads/unsorted/${encodeURIComponent(uid)}/accept`,
			{
				user_id: this.getNodeParameter('incomingLeadUserId', index) as number,
				status_id: this.getNodeParameter('incomingLeadStatusId', index) as number,
			},
		);
		return outputResponse(this, response);
	},
};

export const decline = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const uid = this.getNodeParameter('incomingLeadUid', index) as string;
		const response = await apiRequest.call(
			this,
			'DELETE',
			`leads/unsorted/${encodeURIComponent(uid)}/decline`,
			{ user_id: this.getNodeParameter('incomingLeadUserId', index) as number },
		);
		return outputResponse(this, response, { success: true, action: 'declined', uid });
	},
};

export const link = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const uid = this.getNodeParameter('incomingLeadUid', index) as string;
		const linkData = parseJson(
			this.getNodeParameter('incomingLeadLinkJson', index) as string,
			this.getNode(),
			index,
			'incoming lead link JSON',
		);
		const response = await apiRequest.call(
			this,
			'POST',
			`leads/unsorted/${encodeURIComponent(uid)}/link`,
			{
				link: linkData,
				user_id: this.getNodeParameter('incomingLeadUserId', index) as number,
			},
		);
		return outputResponse(this, response);
	},
};

export const getSummary = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const filters = this.getNodeParameter('incomingLeadSummaryFilters', index) as {
			createdFrom?: string;
			createdTo?: string;
			pipelineId?: number;
			uids?: string;
		};
		const query = clearNullableProps({
			filter: clearNullableProps({
				uid: stringToArray(filters.uids).map(String),
				created_at: clearNullableProps({
					from: getTimestampFromDateString(filters.createdFrom),
					to: getTimestampFromDateString(filters.createdTo),
				}),
				pipeline_id: filters.pipelineId,
			}),
		}) as IDataObject;
		const response = await apiRequest.call(this, 'GET', 'leads/unsorted/summary', {}, query);
		return outputResponse(this, response);
	},
};
