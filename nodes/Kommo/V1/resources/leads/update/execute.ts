import { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { ICustomFieldValuesForm } from '../../../Interface';

import { apiRequest } from '../../../transport';
import { makeTagsArray } from '../../../helpers/makeTagsArray';
import { getTimestampFromDateString } from '../../../helpers/getTimestampFromDateString';
import { makeCustomFieldReqObject } from '../../_components/CustomFieldsDescription';

interface IFormLead {
	lead: Array<{
		id?: number;
		name?: string;
		price?: number;
		pipeline_id?: number | number[];
		status_id?: number | number[];
		created_by?: number | number[];
		updated_by?: number | number[];
		responsible_user_id?: number | number[];
		closed_at?: string;
		created_at?: string;
		updated_at?: string;
		loss_reason_id?: number | number[];
		custom_fields_values?: ICustomFieldValuesForm;
		_embedded?: {
			tags?: Array<{
				id: number[];
			}>;
		};
	}>;
}

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const requestMethod = 'PATCH';
	const endpoint = `leads`;

	const jsonParams = this.getNodeParameter('json', index) as boolean;

	if (jsonParams) {
		const jsonString = this.getNodeParameter('jsonString', index) as string;
		const responseData = await apiRequest.call(
			this,
			requestMethod,
			endpoint,
			JSON.parse(jsonString),
		);
		return this.helpers.returnJsonArray(responseData);
	}

	const leadsCollection = this.getNodeParameter('collection', index) as IFormLead;

	const body = leadsCollection.lead
		.map((lead) => ({
			...lead,
			id: Number(lead.id),
			created_at: getTimestampFromDateString(lead.created_at),
			updated_at: getTimestampFromDateString(lead.updated_at),
			custom_fields_values:
				lead.custom_fields_values && makeCustomFieldReqObject(lead.custom_fields_values),
			_embedded: {
				...lead._embedded,
				tags: lead._embedded?.tags?.flatMap(makeTagsArray),
			},
		}))
		.map(clearNullableProps);
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
