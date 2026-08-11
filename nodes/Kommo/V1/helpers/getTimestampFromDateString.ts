export const getTimestampFromDateString = (
	dateString: string | number | undefined,
): number | undefined => {
	if (!dateString) return;
	if (typeof dateString === 'number') return dateString;
	const timestamp = Date.parse(dateString);
	return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : undefined;
};
