import {
	IDataObject,
	INodeExecutionData,
	IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import { INumRange, IStringRange } from '../../../Interface';

import { apiRequest, apiRequestAllItems } from '../../../transport';
import { makeRangeProperty } from '../../_components/DateRangeDescription';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { stringToArray } from '../../../helpers/stringToArray';

interface IFilter {
	id?: number[];
	name?: string[];
	price?: INumRange;
	pipeline_id?: number[];
	statuses?: Array<{ pipeline_id: number; status_id: number }>;
	created_by?: number[];
	updated_by?: number[];
	responsible_user_id?: number[];
	created_at: INumRange;
	updated_at: INumRange;
	closed_at: INumRange;
	closest_task_at: INumRange;
}

interface FilterFromFrontend {
	query?: string;
	id?: string;
	name?: string;
	price?: {
		rangeCustom: INumRange;
	};
	pipelines?: number[];
	statuses?: Array<number | string>;
	created_by?: number[];
	updated_by?: number[];
	responsible_user_id?: number[];
	created_at?: {
		dateRangeCustomProperties: IStringRange;
	};
	updated_at?: {
		dateRangeCustomProperties: IStringRange;
	};
	closed_at?: {
		dateRangeCustomProperties: IStringRange;
	};
	closest_task_at?: {
		dateRangeCustomProperties: IStringRange;
	};
}

function toPositiveInteger(value: unknown): number | undefined {
	const parsed = typeof value === 'number' ? value : Number(String(value).trim());
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeLeadStatuses(
	node: ReturnType<IExecuteFunctions['getNode']>,
	values: Array<number | string> = [],
	pipelineIds: number[],
): Array<{ pipeline_id: number; status_id: number }> {
	return values.map((value) => {
		if (typeof value === 'string' && value.trim().startsWith('{')) {
			try {
				const parsed = JSON.parse(value) as { pipeline_id?: unknown; status_id?: unknown };
				const pipelineId = toPositiveInteger(parsed.pipeline_id);
				const statusId = toPositiveInteger(parsed.status_id);
				if (pipelineId && statusId) return { pipeline_id: pipelineId, status_id: statusId };
			} catch {
				// Fall through to the actionable validation error below.
			}
		}

		const statusId = toPositiveInteger(value);
		if (statusId && pipelineIds.length === 1) {
			return { pipeline_id: pipelineIds[0], status_id: statusId };
		}
		throw new NodeOperationError(
			node,
			'Each lead status filter must identify exactly one pipeline and one status',
			{
				description:
					'Reselect the status from the list, or select exactly one pipeline when using a legacy numeric status ID.',
			},
		);
	});
}

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const qs = {} as IDataObject;

	//--------------------------------Add filter--------------------------------------

	const filter = this.getNodeParameter('filter', index) as FilterFromFrontend;
	const { query, pipelines, statuses, ...filterWithoutQuery } = filter;
	if (query) qs.query = query;
	const pipelineIds = (pipelines ?? [])
		.map(toPositiveInteger)
		.filter((value): value is number => value !== undefined);

	const normalizedFilter = clearNullableProps({
		...filterWithoutQuery,
		pipeline_id: pipelineIds,
		statuses: normalizeLeadStatuses(this.getNode(), statuses, pipelineIds),
		id: stringToArray(filterWithoutQuery.id).filter((value) => typeof value === 'number'),
		name: stringToArray(filterWithoutQuery.name).filter((value) => typeof value === 'string'),
		price: filterWithoutQuery.price?.rangeCustom,
		created_at: makeRangeProperty(filterWithoutQuery.created_at?.dateRangeCustomProperties),
		updated_at: makeRangeProperty(filterWithoutQuery.updated_at?.dateRangeCustomProperties),
		closest_task_at: makeRangeProperty(
			filterWithoutQuery.closest_task_at?.dateRangeCustomProperties,
		),
		closed_at: makeRangeProperty(filterWithoutQuery.closed_at?.dateRangeCustomProperties),
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
	const endpoint = `leads`;

	if (returnAll) {
		const responseData = await apiRequestAllItems.call(
			this,
			requestMethod,
			endpoint,
			body,
			qs,
			'leads',
		);
		return this.helpers.returnJsonArray(responseData);
	}

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	return this.helpers.returnJsonArray(responseData);
}
