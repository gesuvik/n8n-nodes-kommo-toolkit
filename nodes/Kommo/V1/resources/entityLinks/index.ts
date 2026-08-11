import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { clearNullableProps } from '../../helpers/clearNullableProps';
import { apiRequest } from '../../transport';
import { extractEmbedded, outputResponse } from '../_shared';

const resource = 'entityLinks';

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

function readLinks(context: IExecuteFunctions, index: number): IDataObject[] {
	const collection = context.getNodeParameter('entityLinkCollection', index) as {
		link?: Array<{
			to_entity_id: number;
			to_entity_type: string;
			catalog_id?: number;
			main_contact?: boolean;
			quantity?: number;
		}>;
	};
	return (collection.link ?? []).map((link) => ({
		to_entity_id: link.to_entity_id,
		to_entity_type: link.to_entity_type,
		...(clearNullableProps({
			metadata: clearNullableProps({
				catalog_id: link.catalog_id || undefined,
				main_contact: link.main_contact || undefined,
				quantity: link.quantity || undefined,
			}),
		}) ?? {}),
	}));
}

export const getMany = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entityType = this.getNodeParameter('entityLinkType', index) as string;
		const entityId = this.getNodeParameter('entityLinkId', index) as number;
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
		const entityType = this.getNodeParameter('entityLinkType', index) as string;
		const entityId = this.getNodeParameter('entityLinkId', index) as number;
		const response = await apiRequest.call(
			this,
			'POST',
			`${entityType}/${entityId}/link`,
			readLinks(this, index),
		);
		return outputResponse(this, response, { success: true, action: 'linked' });
	},
};

export const unlink = {
	async execute(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
		const entityType = this.getNodeParameter('entityLinkType', index) as string;
		const entityId = this.getNodeParameter('entityLinkId', index) as number;
		const response = await apiRequest.call(
			this,
			'POST',
			`${entityType}/${entityId}/unlink`,
			readLinks(this, index),
		);
		return outputResponse(this, response, { success: true, action: 'unlinked' });
	},
};
