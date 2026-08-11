import { timingSafeEqual } from 'node:crypto';
import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { webhookEventOptions } from './V1/helpers/webhookEvents';
import { extractEmbedded } from './V1/resources/_shared';
import { apiRequest } from './V1/transport';

const WEBHOOK_SECRET_PARAMETER = 'kommo_secret';
const MINIMUM_WEBHOOK_SECRET_LENGTH = 32;

function getWebhookSecret(context: IHookFunctions | IWebhookFunctions): string {
	const secret = String(context.getNodeParameter('webhookSecret') ?? '').trim();
	if (secret.length < MINIMUM_WEBHOOK_SECRET_LENGTH) {
		throw new NodeOperationError(
			context.getNode(),
			`Webhook Secret must contain at least ${MINIMUM_WEBHOOK_SECRET_LENGTH} characters`,
		);
	}
	return secret;
}

function addWebhookSecret(destination: string, secret: string): string {
	const url = new URL(destination);
	url.searchParams.set(WEBHOOK_SECRET_PARAMETER, secret);
	return url.toString();
}

function secretsMatch(expected: string, received: unknown): boolean {
	if (typeof received !== 'string') return false;
	const expectedBytes = Buffer.from(expected);
	const receivedBytes = Buffer.from(received);
	return (
		expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
	);
}

async function getRegisteredWebhooks(
	context: IHookFunctions,
	destination: string,
): Promise<IDataObject[]> {
	const response = await apiRequest.call(
		context,
		'GET',
		'webhooks',
		{},
		{ filter: { destination } },
	);
	return extractEmbedded(response, 'webhooks');
}

function normalizeSettings(settings: unknown): string[] {
	if (!Array.isArray(settings)) return [];
	return [
		...new Set(
			settings
				.filter((setting): setting is string => typeof setting === 'string')
				.map((setting) => setting.trim())
				.filter(Boolean),
		),
	].sort();
}

function webhookMatches(webhook: IDataObject, destination: string, settings: string[]): boolean {
	if (webhook.destination !== destination) return false;
	if (webhook.disabled === true || webhook.disabled === 1 || webhook.disabled === '1') return false;
	const registeredSettings = normalizeSettings(webhook.settings);
	return (
		registeredSettings.length === settings.length &&
		registeredSettings.every((setting, index) => setting === settings[index])
	);
}

export class KommoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kommo Trigger',
		name: 'kommoTrigger',
		icon: { dark: 'file:kommo_logo.dark.svg', light: 'file:kommo_logo.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when selected Kommo events occur',
		defaults: { name: 'Kommo Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'kommoOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oAuth2'] } },
			},
			{
				name: 'kommoLongLivedApi',
				required: true,
				displayOptions: { show: { authentication: ['longLivedToken'] } },
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'kommo',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Long Lived Token', value: 'longLivedToken' },
					{ name: 'OAuth2', value: 'oAuth2' },
				],
				default: 'oAuth2',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: webhookEventOptions,
				default: ['add_lead', 'update_lead', 'status_lead'],
				required: true,
				description:
					'Events that activate the workflow. Administrator rights are required to register webhooks.',
			},
			{
				displayName: 'Webhook Secret',
				name: 'webhookSecret',
				type: 'string',
				typeOptions: { password: true },
				noDataExpression: true,
				default: '',
				required: true,
				description:
					'A private value of at least 32 characters used to authenticate every incoming Kommo webhook',
			},
			{
				displayName: 'Include Request Metadata',
				name: 'includeRequestMetadata',
				type: 'boolean',
				default: false,
				description: 'Whether to include request headers and query parameters in the output',
			},
		],
		usableAsTool: true,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const rawDestination = this.getNodeWebhookUrl('default');
				if (!rawDestination) return false;
				const destination = addWebhookSecret(rawDestination, getWebhookSecret(this));
				const settings = normalizeSettings(this.getNodeParameter('events'));
				const webhooks = await getRegisteredWebhooks(this, destination);
				return webhooks.some((webhook) => webhookMatches(webhook, destination, settings));
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const rawDestination = this.getNodeWebhookUrl('default');
				if (!rawDestination) {
					throw new NodeOperationError(this.getNode(), 'Could not generate the n8n webhook URL');
				}
				const destination = addWebhookSecret(rawDestination, getWebhookSecret(this));
				const settings = normalizeSettings(this.getNodeParameter('events'));
				const webhooks = await getRegisteredWebhooks(this, destination);
				if (webhooks.some((webhook) => webhookMatches(webhook, destination, settings))) return true;
				if (webhooks.some((webhook) => webhook.destination === destination)) {
					await apiRequest.call(this, 'DELETE', 'webhooks', { destination });
				}
				const legacyWebhooks = await getRegisteredWebhooks(this, rawDestination);
				if (legacyWebhooks.some((webhook) => webhook.destination === rawDestination)) {
					await apiRequest.call(this, 'DELETE', 'webhooks', { destination: rawDestination });
				}
				await apiRequest.call(this, 'POST', 'webhooks', { destination, settings });
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const rawDestination = this.getNodeWebhookUrl('default');
				if (!rawDestination) return true;
				const destination = addWebhookSecret(rawDestination, getWebhookSecret(this));
				const webhooks = await getRegisteredWebhooks(this, destination);
				if (webhooks.some((webhook) => webhook.destination === destination)) {
					await apiRequest.call(this, 'DELETE', 'webhooks', { destination });
				}
				const legacyWebhooks = await getRegisteredWebhooks(this, rawDestination);
				if (legacyWebhooks.some((webhook) => webhook.destination === rawDestination)) {
					await apiRequest.call(this, 'DELETE', 'webhooks', { destination: rawDestination });
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const query = { ...this.getQueryData() } as IDataObject;
		const secret = getWebhookSecret(this);
		if (!secretsMatch(secret, query[WEBHOOK_SECRET_PARAMETER])) {
			this.getResponseObject().status(401).send('Unauthorized');
			return { noWebhookResponse: true };
		}
		delete query[WEBHOOK_SECRET_PARAMETER];
		const includeMetadata = this.getNodeParameter('includeRequestMetadata') as boolean;
		const data: IDataObject = includeMetadata
			? {
					body,
					headers: this.getHeaderData() as IDataObject,
					query,
					receivedAt: new Date().toISOString(),
				}
			: body;
		return { workflowData: [this.helpers.returnJsonArray(data)] };
	}
}
