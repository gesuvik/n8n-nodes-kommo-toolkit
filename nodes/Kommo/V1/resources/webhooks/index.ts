import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { webhookEventOptions } from '../../helpers/webhookEvents';
import { apiRequest } from '../../transport';
import { deletionResult, extractEmbedded, outputResponse } from '../_shared';

const resource = 'webhooks';

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
			{ name: 'Create', value: 'create', action: 'Create a webhook' },
			{ name: 'Delete', value: 'remove', action: 'Delete a webhook' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many webhooks' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Destination URL',
		name: 'webhookDestination',
		type: 'string',
		default: '',
		required: true,
		description: 'HTTPS URL that receives Kommo notifications',
		displayOptions: show(['create', 'remove']),
	},
	{
		displayName: 'Events',
		name: 'webhookEvents',
		type: 'multiOptions',
		default: ['add_lead', 'update_lead'],
		required: true,
		options: webhookEventOptions,
		description: 'Use an expression to pass another supported event code',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Destination Filter',
		name: 'webhookDestinationFilter',
		type: 'string',
		default: '',
		description: 'Return only the webhook registered for this destination URL',
		displayOptions: show(['getMany']),
	},
];

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const destination = this.getNodeParameter('webhookDestinationFilter', index) as string;
		const response = await apiRequest.call(
			this,
			'GET',
			'webhooks',
			{},
			destination ? { filter: { destination } } : {},
		);
		return this.helpers.returnJsonArray(extractEmbedded(response, 'webhooks'));
	},
};

export const create = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const destination = this.getNodeParameter('webhookDestination', index) as string;
		const settings = this.getNodeParameter('webhookEvents', index) as string[];
		const response = await apiRequest.call(this, 'POST', 'webhooks', { destination, settings });
		return outputResponse(this, response);
	},
};

export const remove = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const destination = this.getNodeParameter('webhookDestination', index) as string;
		await apiRequest.call(this, 'DELETE', 'webhooks', { destination });
		return deletionResult(this, 'webhook', destination);
	},
};
