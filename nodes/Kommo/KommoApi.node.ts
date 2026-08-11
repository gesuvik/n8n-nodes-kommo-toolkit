import {
	IExecuteFunctions,
	IHttpRequestMethods,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { normalizeKommoApiPath } from '../../credentials/kommoUrl';
import { parseOptionalJson } from './V1/helpers/parseJson';
import { extractEmbedded, outputResponse } from './V1/resources/_shared';
import { apiRequest, apiRequestAllItems } from './V1/transport';

export function normalizeApiEndpoint(node: INode, endpoint: string): string {
	const normalized = endpoint
		.trim()
		.replace(/^\/+/, '')
		.replace(/^api\/v4\//, '');
	try {
		return normalizeKommoApiPath(normalized);
	} catch {
		throw new NodeOperationError(
			node,
			'Endpoint must be a safe path relative to /api/v4, without a query string',
		);
	}
}

export class KommoApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kommo API',
		name: 'kommoApi',
		icon: { dark: 'file:kommo_logo.dark.svg', light: 'file:kommo_logo.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["method"] + ": " + $parameter["endpoint"]}}',
		description:
			'Calls an authenticated Kommo API v4 endpoint without configuring an HTTP Request node',
		defaults: { name: 'Kommo API' },
		inputs: [NodeConnectionTypes.Main],
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
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'GET', value: 'GET' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
			},
			{
				displayName: 'Endpoint',
				name: 'endpoint',
				type: 'string',
				default: 'account',
				required: true,
				placeholder: 'leads/123',
				description: 'Path relative to /api/v4. Do not include the domain or query string.',
			},
			{
				displayName: 'Query JSON',
				name: 'queryJson',
				type: 'json',
				default: '{}',
				description: 'Query parameters as a JSON object',
			},
			{
				displayName: 'Body JSON',
				name: 'bodyJson',
				type: 'json',
				default: '{}',
				description: 'Request body as a JSON object or array',
				displayOptions: { hide: { method: ['GET'] } },
			},
			{
				displayName: 'Return All Pages',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show: { method: ['GET'] } },
			},
			{
				displayName: 'Embedded Collection Key',
				name: 'embeddedKey',
				type: 'string',
				default: '',
				placeholder: 'leads',
				description: 'Optional _embedded key to return entities instead of HAL envelopes',
				displayOptions: { show: { method: ['GET'] } },
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let index = 0; index < items.length; index++) {
			try {
				const method = this.getNodeParameter('method', index) as IHttpRequestMethods;
				const endpoint = normalizeApiEndpoint(
					this.getNode(),
					this.getNodeParameter('endpoint', index) as string,
				);
				const query = parseOptionalJson(
					this.getNodeParameter('queryJson', index) as string,
					this.getNode(),
					index,
					'query JSON',
				);
				if (Array.isArray(query)) {
					throw new NodeOperationError(this.getNode(), 'Query JSON must contain an object', {
						itemIndex: index,
					});
				}
				const body =
					method === 'GET'
						? {}
						: (parseOptionalJson(
								this.getNodeParameter('bodyJson', index) as string,
								this.getNode(),
								index,
								'body JSON',
							) ?? {});

				let response: unknown;
				if (method === 'GET' && (this.getNodeParameter('returnAll', index) as boolean)) {
					response = await apiRequestAllItems.call(this, method, endpoint, {}, query ?? {});
				} else {
					response = await apiRequest.call(this, method, endpoint, body, query ?? {});
				}

				const embeddedKey =
					method === 'GET' ? (this.getNodeParameter('embeddedKey', index) as string) : '';
				const responseItems = embeddedKey
					? this.helpers.returnJsonArray(extractEmbedded(response, embeddedKey))
					: outputResponse(this, response);
				results.push(
					...this.helpers.constructExecutionMetaData(responseItems, { itemData: { item: index } }),
				);
			} catch (error) {
				if (!this.continueOnFail()) {
					throw new NodeOperationError(
						this.getNode(),
						error instanceof Error ? error : new Error(String(error)),
						{ itemIndex: index },
					);
				}
				results.push({ ...items[index], error, pairedItem: { item: index } });
			}
		}

		return [results];
	}
}
