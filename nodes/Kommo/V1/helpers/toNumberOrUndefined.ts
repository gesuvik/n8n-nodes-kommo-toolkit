export function toNumberOrUndefined(value: unknown): number | undefined {
	if (value === null || value === undefined || value === '') return undefined;
	const number = Number(value);
	return Number.isFinite(number) ? number : undefined;
}
