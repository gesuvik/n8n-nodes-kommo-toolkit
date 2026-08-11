import { INodeExecutionData, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { clearNullableProps } from '../../../helpers/clearNullableProps';
import { apiRequest } from '../../../transport';
import { getTimestampFromDateString } from '../../../helpers/getTimestampFromDateString';
import { toNumberOrUndefined } from '../../../helpers/toNumberOrUndefined';
import { IUpdateTaskForm, RequestTaskUpdate } from '../types';

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const requestMethod = 'PATCH';
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

	const tasksCollection = this.getNodeParameter('collection', index) as IUpdateTaskForm;

	const body = tasksCollection.task
		.map((task): RequestTaskUpdate => {
			const id = Number(task.id);
			if (!Number.isSafeInteger(id) || id <= 0) {
				throw new NodeOperationError(this.getNode(), 'Task ID must be a positive integer');
			}
			const completeTill = task.complete_till
				? getTimestampFromDateString(task.complete_till)
				: undefined;
			if (task.complete_till && !completeTill) {
				throw new NodeOperationError(this.getNode(), 'Complete Till must be a valid date');
			}
			const entityId = toNumberOrUndefined(task.entity_id);
			const hasEntityId = task.entity_id !== undefined && String(task.entity_id).trim() !== '';
			const hasEntityType = task.entity_type !== undefined;
			if (hasEntityId && !entityId) {
				throw new NodeOperationError(this.getNode(), 'Entity ID must be a positive integer');
			}
			if (hasEntityId !== hasEntityType) {
				throw new NodeOperationError(
					this.getNode(),
					'Entity ID and Entity Type must be provided together when relinking a task',
				);
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
				id,
				complete_till: completeTill,
				entity_id: entityId,
				result: resultText ? { text: resultText } : undefined,
				created_at: getTimestampFromDateString(task.created_at),
				updated_at: getTimestampFromDateString(task.updated_at),
				duration: toNumberOrUndefined(task.duration),
			};
		})
		.map(clearNullableProps)
		.filter((task): task is RequestTaskUpdate => task !== undefined);
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}
