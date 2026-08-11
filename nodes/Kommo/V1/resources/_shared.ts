import { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems } from '../transport';

export function outputResponse(
	context: IExecuteFunctions,
	response: unknown,
	fallback: IDataObject = { success: true },
): INodeExecutionData[] {
	if (response === undefined || response === null || response === '') {
		return context.helpers.returnJsonArray(fallback);
	}
	if (typeof response !== 'object') {
		return context.helpers.returnJsonArray({ data: response });
	}
	return context.helpers.returnJsonArray(response as IDataObject | IDataObject[]);
}

export function extractEmbedded(response: unknown, key: string): IDataObject[] {
	const pages = Array.isArray(response) ? response : [response];
	return pages.flatMap((page) => {
		if (!page || typeof page !== 'object' || !('_embedded' in page)) return [];
		const embedded = page._embedded;
		if (!embedded || typeof embedded !== 'object' || !(key in embedded)) return [];
		const collection = embedded[key as keyof typeof embedded];
		return Array.isArray(collection) ? (collection as IDataObject[]) : [];
	});
}

export async function getCollection(
	this: IExecuteFunctions,
	index: number,
	endpoint: string,
	embeddedKey: string,
	query: IDataObject = {},
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
	if (returnAll) {
		const pages = await apiRequestAllItems.call(this, 'GET', endpoint, {}, query);
		return this.helpers.returnJsonArray(extractEmbedded(pages, embeddedKey));
	}

	query.page = this.getNodeParameter('page', index, 1) as number;
	query.limit = this.getNodeParameter('limit', index, 50) as number;
	const response = await apiRequest.call(this, 'GET', endpoint, {}, query);
	return this.helpers.returnJsonArray(extractEmbedded(response, embeddedKey));
}

export function deletionResult(
	context: IExecuteFunctions,
	resource: string,
	id?: string | number,
): INodeExecutionData[] {
	return context.helpers.returnJsonArray({
		success: true,
		resource,
		...(id === undefined ? {} : { id }),
	});
}
