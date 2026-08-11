import { IDataObject, INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems } from '../../../transport';

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const qs = {} as IDataObject;

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
	const endpoint = `catalogs`;

	if (returnAll) {
		const responseData = await apiRequestAllItems.call(
			this,
			requestMethod,
			endpoint,
			body,
			qs,
			'catalogs',
		);
		return this.helpers.returnJsonArray(responseData);
	}

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	return this.helpers.returnJsonArray(responseData);
}
