import { IDataObject } from 'n8n-workflow';

function cleanValue(value: unknown): unknown {
	if (value === null || value === undefined || value === '') return undefined;
	if (typeof value === 'number' && !Number.isFinite(value)) return undefined;

	if (Array.isArray(value)) {
		const cleaned = value.map(cleanValue).filter((item) => item !== undefined);
		return cleaned.length ? cleaned : undefined;
	}

	if (typeof value === 'object') {
		return clearNullableProps(value as IDataObject);
	}

	return value;
}

export function clearNullableProps(obj?: IDataObject | null): IDataObject | undefined {
	if (!obj) return undefined;

	const result: IDataObject = {};
	for (const [key, value] of Object.entries(obj)) {
		const cleaned = cleanValue(value);
		if (cleaned !== undefined) result[key] = cleaned as IDataObject[string];
	}

	return Object.keys(result).length ? result : undefined;
}
