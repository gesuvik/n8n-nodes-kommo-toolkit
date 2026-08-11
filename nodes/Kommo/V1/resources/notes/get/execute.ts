import { IDataObject, INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { INumRange, IStringRange } from '../../../Interface';

import { apiRequest, apiRequestAllItems } from '../../../transport';
import { makeRangeProperty } from '../../_components/DateRangeDescription';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { stringToArray } from '../../../helpers/stringToArray';

interface IFilter {
	id?: number[];
	entity_id?: number[];
	note_type?: string[];
	updated_at: INumRange;
}

interface FilterFromFrontend {
	id?: string;
	entity_id?: string;
	note_type?: string[];
	updated_at?: {
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

	const normalizedFilter = clearNullableProps({
		...filter,
		id: stringToArray(filter.id).filter((value) => typeof value === 'number'),
		entity_id: stringToArray(filter.entity_id).filter((value) => typeof value === 'number'),
		note_type: filter.note_type,
		updated_at: makeRangeProperty(filter.updated_at?.dateRangeCustomProperties),
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
	};

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
	const endpoint = this.getNodeParameter('entity_type', index) + '/notes';

	if (returnAll) {
		const responseData = await apiRequestAllItems.call(
			this,
			requestMethod,
			endpoint,
			body,
			qs,
			'notes',
		);
		return this.helpers.returnJsonArray(responseData);
	}

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	return this.helpers.returnJsonArray(responseData);
}
