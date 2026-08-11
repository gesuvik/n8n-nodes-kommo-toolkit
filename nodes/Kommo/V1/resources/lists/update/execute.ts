import { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { apiRequest } from '../../../transport';
import { IUpdateListForm, RequestListUpdate } from '../types';

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const requestMethod = 'PATCH';
	const endpoint = `catalogs`;

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

	const listsCollection = this.getNodeParameter('collection', index) as IUpdateListForm;

	const body = listsCollection.list
		.map((list): RequestListUpdate => {
			return {
				id: Number(list.id),
				name: typeof list.name === 'string' ? list.name : undefined,
				can_link_multiple:
					typeof list.can_link_multiple === 'boolean' ? list.can_link_multiple : undefined,
				request_id: list.request_id ? String(list.request_id) : undefined,
			};
		})
		.map(clearNullableProps);

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
