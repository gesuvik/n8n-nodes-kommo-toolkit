export const isNumber = (v: string | number): boolean => {
	const value = String(v).trim();
	return value.length > 0 && Number.isFinite(Number(value));
};
