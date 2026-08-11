import {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { clearNullableProps } from './V1/helpers/clearNullableProps';
import { parseJson } from './V1/helpers/parseJson';
import * as loadOptions from './V1/methods';
import { extractEmbedded, outputResponse } from './V1/resources/_shared';
import { apiRequest } from './V1/transport';

interface BulkTarget {
	embeddedKey: string;
	endpoint: string;
}

function getTarget(node: INode, entity: string, catalogId?: number): BulkTarget {
	switch (entity) {
		case 'leads':
		case 'contacts':
		case 'companies':
		case 'tasks':
			return { endpoint: entity, embeddedKey: entity };
		case 'catalogElements':
			if (!catalogId) {
				throw new NodeOperationError(node, 'A List ID is required for list elements');
			}
			return { endpoint: `catalogs/${catalogId}/elements`, embeddedKey: 'elements' };
		default:
			throw new NodeOperationError(node, `Unsupported bulk entity: ${entity}`);
	}
}

function chunk<T>(values: T[], size: number): T[][] {
	const safeSize = Number.isFinite(size) ? Math.max(1, Math.floor(size)) : 1;
	const result: T[][] = [];
	for (let index = 0; index < values.length; index += safeSize) {
		result.push(values.slice(index, index + safeSize));
	}
	return result;
}

export class KommoBulk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kommo Bulk',
		name: 'kommoBulk',
		icon: { dark: 'file:kommo_logo.dark.svg', light: 'file:kommo_logo.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["entity"]}}',
		description: 'Creates or updates Kommo entities in efficient batches',
		defaults: { name: 'Kommo Bulk' },
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
				options: [
					{ name: 'Long Lived Token', value: 'longLivedToken' },
					{ name: 'OAuth2', value: 'oAuth2' },
				],
				default: 'oAuth2',
			},
			{
				displayName: 'Entity',
				name: 'entity',
				type: 'options',
				options: [
					{ name: 'Company', value: 'companies' },
					{ name: 'Contact', value: 'contacts' },
					{ name: 'Lead', value: 'leads' },
					{ name: 'List Element', value: 'catalogElements' },
					{ name: 'Task', value: 'tasks' },
				],
				default: 'leads',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Create', value: 'create', action: 'Create entities in batches' },
					{ name: 'Update', value: 'update', action: 'Update entities in batches' },
				],
				default: 'create',
			},
			{
				displayName: 'List Name or ID',
				name: 'catalogId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getCatalogs' },
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { entity: ['catalogElements'] } },
			},
			{
				displayName: 'Data Source',
				name: 'dataSource',
				type: 'options',
				options: [
					{ name: 'Input Items', value: 'inputItems' },
					{ name: 'JSON Array', value: 'json' },
				],
				default: 'inputItems',
				description: 'Input Items sends each incoming $JSON object as one Kommo entity',
			},
			{
				displayName: 'Entities JSON',
				name: 'entitiesJson',
				type: 'json',
				default: '[]',
				required: true,
				description: 'Array of Kommo entity objects',
				displayOptions: { show: { dataSource: ['json'] } },
			},
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 50 },
				description: 'Kommo supports up to 250 entities but recommends batches of no more than 50',
			},
			{
				displayName: 'Remove Empty Values',
				name: 'removeEmptyValues',
				type: 'boolean',
				default: true,
				description:
					'Whether to remove empty strings, nulls, undefined values, and invalid numbers',
			},
		],
		usableAsTool: true,
	};

	methods = { loadOptions };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		const entity = this.getNodeParameter('entity', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as 'create' | 'update';
		const dataSource = this.getNodeParameter('dataSource', 0) as 'inputItems' | 'json';
		const catalogId =
			entity === 'catalogElements' ? (this.getNodeParameter('catalogId', 0) as number) : undefined;
		const target = getTarget(this.getNode(), entity, catalogId);

		let entities: IDataObject[];
		if (dataSource === 'inputItems') {
			entities = inputItems.map((item) => ({ ...item.json }));
		} else {
			const parsed = parseJson(
				this.getNodeParameter('entitiesJson', 0) as string,
				this.getNode(),
				0,
				'entities JSON',
			);
			if (!Array.isArray(parsed)) {
				throw new NodeOperationError(this.getNode(), 'Entities JSON must contain an array');
			}
			entities = parsed;
		}

		const removeEmptyValues = this.getNodeParameter('removeEmptyValues', 0) as boolean;
		if (removeEmptyValues) {
			entities = entities
				.map((item) => clearNullableProps(item))
				.filter((item): item is IDataObject => Boolean(item));
		}
		if (!entities.length) return [[]];

		const batchSize = this.getNodeParameter('batchSize', 0) as number;
		const batches = chunk(
			entities.map((data, sourceIndex) => ({ data, sourceIndex })),
			batchSize,
		);
		const results: INodeExecutionData[] = [];

		for (const batch of batches) {
			try {
				const response = await apiRequest.call(
					this,
					operation === 'create' ? 'POST' : 'PATCH',
					target.endpoint,
					batch.map((entry) => entry.data),
				);
				const embedded = extractEmbedded(response, target.embeddedKey);
				const responseItems = embedded.length
					? this.helpers.returnJsonArray(embedded)
					: outputResponse(this, response);
				for (let responseIndex = 0; responseIndex < responseItems.length; responseIndex++) {
					const sourceIndex = batch[Math.min(responseIndex, batch.length - 1)].sourceIndex;
					results.push({
						...responseItems[responseIndex],
						pairedItem: { item: dataSource === 'inputItems' ? sourceIndex : 0 },
					});
				}
			} catch (error) {
				if (!this.continueOnFail()) {
					throw new NodeOperationError(
						this.getNode(),
						error instanceof Error ? error : new Error(String(error)),
					);
				}
				for (const entry of batch) {
					results.push({
						json: entry.data,
						error,
						pairedItem: { item: dataSource === 'inputItems' ? entry.sourceIndex : 0 },
					});
				}
			}
		}

		return [results];
	}
}
