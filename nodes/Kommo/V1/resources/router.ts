import { INodeExecutionData, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { IKommo } from './interfaces';

import * as account from './account';
import * as contacts from './contacts';
import * as leads from './leads';
import * as tasks from './tasks';
import * as companies from './companies';
import * as notes from './notes';
import * as lists from './lists';
import * as customFields from './customFields';
import * as entityLinks from './entityLinks';
import * as events from './events';
import * as incomingLeads from './incomingLeads';
import * as pipelines from './pipelines';
import * as pipelineStages from './pipelineStages';
import * as salesbots from './salesbots';
import * as sources from './sources';
import * as tags from './tags';
import * as users from './users';
import * as webhooks from './webhooks';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<IKommo>('resource', i);
		const operation = this.getNodeParameter('operation', i);

		const kommo = {
			resource,
			operation,
		} as IKommo;

		try {
			let responseData: INodeExecutionData[];
			if (kommo.resource === 'account') {
				responseData = await account[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'contacts') {
				responseData = await contacts[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'leads') {
				responseData = await leads[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'tasks') {
				responseData = await tasks[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'companies') {
				responseData = await companies[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'notes') {
				responseData = await notes[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'lists') {
				responseData = await lists[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'customFields') {
				responseData = await customFields[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'entityLinks') {
				responseData = await entityLinks[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'events') {
				responseData = await events[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'incomingLeads') {
				responseData = await incomingLeads[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'pipelines') {
				responseData = await pipelines[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'pipelineStages') {
				responseData = await pipelineStages[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'salesbots') {
				responseData = await salesbots[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'sources') {
				responseData = await sources[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'tags') {
				responseData = await tags[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'users') {
				responseData = await users[kommo.operation].execute.call(this, i);
			} else if (kommo.resource === 'webhooks') {
				responseData = await webhooks[kommo.operation].execute.call(this, i);
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`Unsupported resource: ${String(this.getNodeParameter('resource', i))}`,
				);
			}

			const executionData = this.helpers.constructExecutionMetaData(responseData, {
				itemData: { item: i },
			});
			operationResult.push(...executionData);
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({ ...items[i], error: err, pairedItem: { item: i } });
			} else {
				throw new NodeOperationError(
					this.getNode(),
					err instanceof Error ? err : new Error(String(err)),
					{ itemIndex: i },
				);
			}
		}
	}

	return [operationResult];
}
