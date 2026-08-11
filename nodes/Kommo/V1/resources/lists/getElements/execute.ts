import { IDataObject, INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems } from '../../../transport';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { stringToArray } from '../../../helpers/stringToArray';

interface FilterFromFrontend {
	query?: string;
	id?: string;
}

interface IFilter {
	id?: number[];
}

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const qs = {} as IDataObject;

	//--------------------------------Add filter--------------------------------------

	const filter = this.getNodeParameter('filter', index) as FilterFromFrontend;
	const { query, ...filterWithoutQuery } = filter;
	if (query) qs.query = query;

	const normalizedFilter = clearNullableProps({
		id: stringToArray(filterWithoutQuery.id).filter((value) => typeof value === 'number'),
	}) as IFilter | undefined;
	if (normalizedFilter) qs.filter = normalizedFilter;

	//------------------------------Add pagination-------------------------------------
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	if (!returnAll) {
		const page = this.getNodeParameter('page', index) as number;
		qs.page = page;
		qs.limit = this.getNodeParameter('limit', index) as number;
	}

	//---------------------------------------------------------------------------------

	const listId = this.getNodeParameter('catalog_id', index) as string | number;

	const requestMethod = 'GET';
	const endpoint = `catalogs/${listId}/elements`;

	if (returnAll) {
		const responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData);
	}

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	return this.helpers.returnJsonArray(responseData);
}
