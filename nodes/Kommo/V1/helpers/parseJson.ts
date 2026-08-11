import { IDataObject, INode, NodeOperationError } from 'n8n-workflow';

export function parseJson(
	value: string,
	node: INode,
	itemIndex: number,
	label = 'JSON',
): IDataObject | IDataObject[] {
	try {
		const parsed = JSON.parse(value) as unknown;
		if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
			throw new Error(`${label} must contain an object or an array`);
		}
		return parsed as IDataObject | IDataObject[];
	} catch (error) {
		throw new NodeOperationError(
			node,
			error instanceof Error ? error : new Error(`Invalid ${label}`),
			{ itemIndex, description: `Check the syntax of the ${label} parameter.` },
		);
	}
}

export function parseOptionalJson(
	value: string | undefined,
	node: INode,
	itemIndex: number,
	label = 'JSON',
): IDataObject | IDataObject[] | undefined {
	if (!value?.trim()) return undefined;
	return parseJson(value, node, itemIndex, label);
}
