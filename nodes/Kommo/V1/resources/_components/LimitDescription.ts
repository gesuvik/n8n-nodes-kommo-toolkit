import { IDisplayOptions, INodeProperties } from 'n8n-workflow';

export const addLimitDescription = (
	displayOptions: IDisplayOptions | undefined,
): INodeProperties => {
	return {
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				...displayOptions?.show,
				returnAll: [false],
			},
			hide: displayOptions?.hide,
		},
		typeOptions: {
			minValue: 1,
			numberStepSize: 1,
		},
		default: 50,
	};
};
