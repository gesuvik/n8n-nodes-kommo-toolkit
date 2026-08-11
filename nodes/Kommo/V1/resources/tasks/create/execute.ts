import { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { apiRequest } from '../../../transport';
import { getTimestampFromDateString } from '../../../helpers/getTimestampFromDateString';
import { toNumberOrUndefined } from '../../../helpers/toNumberOrUndefined';
import { IFormTask, RequestTaskCreate } from '../types';

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const requestMethod = 'POST';
	const endpoint = `tasks`;

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

	const tasksCollection = this.getNodeParameter('collection', index) as IFormTask;

	const body = tasksCollection.task
		.map((task): RequestTaskCreate => {
			const data = { ...task, result: { text: task.resultText }, resultText: undefined };
			return {
				...data,
				complete_till: getTimestampFromDateString(task.complete_till) || 0,
				entity_id: toNumberOrUndefined(task.entity_id),
				result: { text: task.resultText },
				created_at: getTimestampFromDateString(task.created_at),
				updated_at: getTimestampFromDateString(task.updated_at),
				duration: toNumberOrUndefined(task.duration),
			};
		})
		.map(clearNullableProps);

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
