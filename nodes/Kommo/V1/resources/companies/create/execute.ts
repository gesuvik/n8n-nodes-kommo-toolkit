import { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { ICustomFieldValuesForm } from '../../../Interface';

import { apiRequest } from '../../../transport';
import { makeCustomFieldReqObject } from '../../_components/CustomFieldsDescription';
import { getTimestampFromDateString } from '../../../helpers/getTimestampFromDateString';

interface IForm {
	company: Array<{
		name?: string;
		responsible_user_id?: number | number[];
		created_by?: number | number[];
		updated_by?: number | number[];
		created_at?: string;
		updated_at?: string;
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
	const requestMethod = 'POST';
	const endpoint = `companies`;

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

	const collection = this.getNodeParameter('collection', index) as IForm;

	const body = collection.company
		.map((company) => ({
			...company,
			created_at: getTimestampFromDateString(company.created_at),
			updated_at: getTimestampFromDateString(company.updated_at),
			custom_fields_values:
				company.custom_fields_values && makeCustomFieldReqObject(company.custom_fields_values),
			_embedded: {
				...company._embedded,
				tags: company._embedded?.tags?.flatMap((group) => group.id.map((id) => ({ id }))),
			},
		}))
		.map(clearNullableProps);
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
