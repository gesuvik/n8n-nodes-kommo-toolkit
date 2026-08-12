import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { apiRequest } from '../../transport';
import { extractEmbedded, outputResponse } from '../_shared';

const resource = 'entityLinks';

type EntityLinkType = 'catalog_elements' | 'companies' | 'contacts' | 'leads';

const allowedLinkTargets: Record<'companies' | 'contacts' | 'leads', EntityLinkType[]> = {
	companies: ['contacts', 'leads', 'catalog_elements'],
	contacts: ['companies', 'catalog_elements'],
	leads: ['contacts', 'companies', 'catalog_elements'],
};

function show(operation: string[]) {
	return { show: { resource: [resource], operation } };
}

const linkCollection: INodeProperties = {
	displayName: 'Linked Entities',
	name: 'entityLinkCollection',
	type: 'fixedCollection',
	placeholder: 'Add Linked Entity',
	default: {},
	typeOptions: { multipleValues: true },
	options: [
		{
			displayName: 'Linked Entity',
			name: 'link',
			values: [
				{
					displayName: 'Catalog ID',
					name: 'catalog_id',
					type: 'number',
					default: 0,
					description: 'Required when linking a catalog element',
				},
				{
					displayName: 'Linked Entity ID',
					name: 'to_entity_id',
					type: 'number',
					default: 0,
					required: true,
				},
				{
					displayName: 'Linked Entity Type',
					name: 'to_entity_type',
					type: 'options',
					default: 'contacts',
					options: [
						{
							name: 'Catalog Element',
							value: 'catalog_elements',
						},
						{
							name: 'Company',
							value: 'companies',
						},
						{
							name: 'Contact',
							value: 'contacts',
						},
						{
							name: 'Lead',
							value: 'leads',
						},
					],
				},
				{
					displayName: 'Main Contact',
					name: 'main_contact',
					type: 'boolean',
					default: false,
					description: 'Whether this contact is the primary contact for the lead',
				},
				{
					displayName: 'Quantity',
					name: 'quantity',
					type: 'number',
					default: 0,
					description: 'Quantity for a linked catalog element',
				},
			],
		},
	],
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{ name: 'Get Many', value: 'getMany', action: 'Get linked entities' },
			{ name: 'Link', value: 'link', action: 'Link entities' },
			{ name: 'Unlink', value: 'unlink', action: 'Unlink entities' },
		],
		default: 'getMany',
	},
	{
		displayName: 'Entity Type',
		name: 'entityLinkType',
		type: 'options',
		default: 'leads',
		options: [
			{ name: 'Company', value: 'companies' },
			{ name: 'Contact', value: 'contacts' },
			{ name: 'Lead', value: 'leads' },
		],
		displayOptions: { show: { resource: [resource] } },
	},
	{
		displayName: 'Entity ID',
		name: 'entityLinkId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: [resource] } },
	},
	{
		displayName: 'Filters',
		name: 'entityLinkFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getMany']),
		options: [
			{ displayName: 'Catalog ID', name: 'catalogId', type: 'number', default: 0 },
			{ displayName: 'Linked Entity ID', name: 'entityId', type: 'number', default: 0 },
			{
				displayName: 'Linked Entity Type',
				name: 'entityType',
				type: 'options',
				default: 'contacts',
				options: [
					{ name: 'Catalog Element', value: 'catalog_elements' },
					{ name: 'Company', value: 'companies' },
					{ name: 'Contact', value: 'contacts' },
					{ name: 'Lead', value: 'leads' },
				],
			},
		],
	},
	{
		...linkCollection,
		displayOptions: show(['link', 'unlink']),
	},
];

function requirePositiveInteger(context: IExecuteFunctions, value: unknown, label: string): number {
	const normalized = typeof value === 'string' ? value.trim() : value;
	const parsed =
		typeof normalized === 'string' && /^\d+$/.test(normalized) ? Number(normalized) : normalized;
	if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed <= 0) {
		throw new NodeOperationError(context.getNode(), `${label} must be a positive integer`);
	}
	return parsed;
}

function readLinks(
	context: IExecuteFunctions,
	index: number,
	entityType: 'companies' | 'contacts' | 'leads',
): IDataObject[] {
	const collection = context.getNodeParameter('entityLinkCollection', index) as {
		link?: Array<{
			to_entity_id: unknown;
			to_entity_type: EntityLinkType;
			catalog_id?: unknown;
			main_contact?: boolean;
			quantity?: unknown;
		}>;
	};
	const links = collection.link ?? [];
	if (!links.length) {
		throw new NodeOperationError(context.getNode(), 'Add at least one linked entity');
	}

	return links.map((link) => {
		if (!allowedLinkTargets[entityType].includes(link.to_entity_type)) {
			throw new NodeOperationError(
				context.getNode(),
				`${link.to_entity_type} cannot be linked from ${entityType}`,
				{
					description: `Kommo allows ${entityType} to link only to ${allowedLinkTargets[
						entityType
					].join(', ')}.`,
				},
			);
		}

		const metadata: IDataObject = {};
		if (link.to_entity_type === 'catalog_elements') {
			metadata.catalog_id = requirePositiveInteger(context, link.catalog_id, 'Catalog ID');
			if (link.quantity !== undefined && link.quantity !== null && Number(link.quantity) !== 0) {
				metadata.quantity = requirePositiveInteger(context, link.quantity, 'Quantity');
			}
		} else if (link.catalog_id && Number(link.catalog_id) !== 0) {
			throw new NodeOperationError(
				context.getNode(),
				'Catalog ID is valid only for catalog elements',
			);
		}

		if (link.main_contact) {
			if (entityType !== 'leads' || link.to_entity_type !== 'contacts') {
				throw new NodeOperationError(
					context.getNode(),
					'Main Contact is valid only when linking a contact to a lead',
				);
			}
			metadata.main_contact = true;
		}

		if (
			link.to_entity_type !== 'catalog_elements' &&
			link.quantity !== undefined &&
			link.quantity !== null &&
			Number(link.quantity) !== 0
		) {
			throw new NodeOperationError(
				context.getNode(),
				'Quantity is valid only for catalog elements',
			);
		}

		return {
			to_entity_id: requirePositiveInteger(context, link.to_entity_id, 'Linked Entity ID'),
			to_entity_type: link.to_entity_type,
			...(Object.keys(metadata).length ? { metadata } : {}),
		};
	});
}

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entityType = this.getNodeParameter('entityLinkType', index) as
			| 'companies'
			| 'contacts'
			| 'leads';
		const entityId = requirePositiveInteger(
			this,
			this.getNodeParameter('entityLinkId', index),
			'Entity ID',
		);
		const filters = this.getNodeParameter('entityLinkFilters', index) as {
			catalogId?: number;
			entityId?: number;
			entityType?: string;
		};
		const query = clearNullableProps({
			filter: clearNullableProps({
				to_entity_id: filters.entityId || undefined,
				to_entity_type: filters.entityType,
				to_catalog_id: filters.catalogId || undefined,
			}),
		}) as IDataObject;
		const response = await apiRequest.call(
			this,
			'GET',
			`${entityType}/${entityId}/links`,
			{},
			query,
		);
		const links = extractEmbedded(response, 'links');
		return links.length ? this.helpers.returnJsonArray(links) : outputResponse(this, response);
	},
};

export const link = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entityType = this.getNodeParameter('entityLinkType', index) as
			| 'companies'
			| 'contacts'
			| 'leads';
		const entityId = requirePositiveInteger(
			this,
			this.getNodeParameter('entityLinkId', index),
			'Entity ID',
		);
		const response = await apiRequest.call(
			this,
			'POST',
			`${entityType}/${entityId}/link`,
			readLinks(this, index, entityType),
		);
		return outputResponse(this, response, { success: true, action: 'linked' });
	},
};

export const unlink = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entityType = this.getNodeParameter('entityLinkType', index) as
			| 'companies'
			| 'contacts'
			| 'leads';
		const entityId = requirePositiveInteger(
			this,
			this.getNodeParameter('entityLinkId', index),
			'Entity ID',
		);
		const response = await apiRequest.call(
			this,
			'POST',
			`${entityType}/${entityId}/unlink`,
			readLinks(this, index, entityType),
		);
		return outputResponse(this, response, { success: true, action: 'unlinked' });
	},
};
