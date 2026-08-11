import { INodeExecutionData, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
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
			const text = task.text?.trim();
			if (!text) {
				throw new NodeOperationError(this.getNode(), 'Text is required for every task');
			}
			const completeTill = getTimestampFromDateString(task.complete_till);
			if (!completeTill) {
				throw new NodeOperationError(this.getNode(), 'Complete Till is required for every task');
			}
			const entityId = toNumberOrUndefined(task.entity_id);
			if (task.entity_id !== undefined && String(task.entity_id).trim() && !entityId) {
				throw new NodeOperationError(this.getNode(), 'Entity ID must be a positive integer');
			}
			const resultText = task.resultText?.trim();
			if (task.is_completed === true && !resultText) {
				throw new NodeOperationError(
					this.getNode(),
					'Result Text is required when a task is completed',
				);
			}
			if (resultText && task.is_completed !== true) {
				throw new NodeOperationError(
					this.getNode(),
					'Is Completed must be enabled when Result Text is provided',
				);
			}
			const data = { ...task, resultText: undefined };
			return {
				...data,
				text,
				complete_till: completeTill,
				entity_id: entityId,
				entity_type: entityId ? task.entity_type : undefined,
				result: resultText ? { text: resultText } : undefined,
				created_at: getTimestampFromDateString(task.created_at),
				updated_at: getTimestampFromDateString(task.updated_at),
				duration: toNumberOrUndefined(task.duration),
			};
		})
		.map(clearNullableProps)
		.filter((task): task is RequestTaskCreate => task !== undefined);

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
