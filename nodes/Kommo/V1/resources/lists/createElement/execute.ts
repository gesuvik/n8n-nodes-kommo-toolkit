import { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { apiRequest } from '../../../transport';
import { IFormListElement, RequestListElementCreate } from '../types';
import { makeCustomFieldReqObject } from '../../_components/CustomFieldsDescription';

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const listId = this.getNodeParameter('catalog_id', index) as string | number;

	const requestMethod = 'POST';
	const endpoint = `catalogs/${listId}/elements`;

	const jsonParams = this.getNodeParameter('json', index) as string | number;

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

	const listsCollection = this.getNodeParameter('collection', index) as IFormListElement;

	const body = listsCollection.element
		.map((element): RequestListElementCreate => {
			return {
				...element,
				custom_fields_values:
					element.custom_fields_values && makeCustomFieldReqObject(element.custom_fields_values),
			};
		})
		.map(clearNullableProps);

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
