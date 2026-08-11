import { IDataObject, INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { INumRange, IStringRange } from '../../../Interface';

import { apiRequest, apiRequestAllItems } from '../../../transport';
import { makeRangeProperty } from '../../_components/DateRangeDescription';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { stringToArray } from '../../../helpers/stringToArray';

interface IFilter {
	id?: number[];
	name?: string[];
	created_by?: number[];
	updated_by?: number[];
	responsible_user_id?: number[];
	created_at: INumRange;
	updated_at: INumRange;
	closest_task_at: INumRange;
}

interface FilterFromFrontend {
	query?: string;
	id?: string;
	name?: string;
	created_by?: number[];
	updated_by?: number[];
	responsible_user_id?: number[];
	created_at?: {
		dateRangeCustomProperties: IStringRange;
	};
	updated_at?: {
		dateRangeCustomProperties: IStringRange;
	};
	closest_task_at?: {
		dateRangeCustomProperties: IStringRange;
	};
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
		...filterWithoutQuery,
		id: stringToArray(filterWithoutQuery.id).filter((value) => typeof value === 'number'),
		name: stringToArray(filterWithoutQuery.name).filter((value) => typeof value === 'string'),
		created_at: makeRangeProperty(filterWithoutQuery.created_at?.dateRangeCustomProperties),
		updated_at: makeRangeProperty(filterWithoutQuery.updated_at?.dateRangeCustomProperties),
		closest_task_at: makeRangeProperty(
			filterWithoutQuery.closest_task_at?.dateRangeCustomProperties,
		),
	}) as IFilter | undefined;
	if (normalizedFilter) qs.filter = normalizedFilter;

	//---------------------------------------------------------------------------------

	//--------------------------------Add options--------------------------------------
	const options = this.getNodeParameter('options', index) as {
		sort: {
			sortSettings: {
				sort_by: string;
				sort_order: string;
			};
		};
		with?: string[];
	};
	qs.with = options.with ? options.with.join(',') : undefined;

	if (options.sort?.sortSettings) {
		qs.order = {
			[options.sort.sortSettings.sort_by]: options.sort.sortSettings.sort_order,
		};
	}
	//---------------------------------------------------------------------------------

	const returnAll = this.getNodeParameter('returnAll', index) as boolean;

	//------------------------------Add pagination-------------------------------------
	if (!returnAll) {
		const page = this.getNodeParameter('page', index) as number;
		qs.page = page;
		qs.limit = this.getNodeParameter('limit', index) as number;
	}

	//---------------------------------------------------------------------------------

	const requestMethod = 'GET';
	const endpoint = `contacts`;

	if (returnAll) {
		const responseData = await apiRequestAllItems.call(
			this,
			requestMethod,
			endpoint,
			body,
			qs,
			'contacts',
		);
		return this.helpers.returnJsonArray(responseData);
	}

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	return this.helpers.returnJsonArray(responseData);
}
