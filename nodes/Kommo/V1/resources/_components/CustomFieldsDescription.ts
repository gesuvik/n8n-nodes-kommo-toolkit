import { INodeProperties } from 'n8n-workflow';
import { ICustomFieldValuesForm, ITypeField } from '../../Interface';
import { isJson } from '../../helpers/isJson';
import { isNumber } from '../../helpers/isNumber';
import { stringToArray } from '../../helpers/stringToArray';

export const addCustomFieldDescription = (loadOptionsMethod: string): INodeProperties => {
	return {
		displayName: 'Custom Fields',
		name: 'custom_fields_values',
		placeholder: 'Add custom field',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Custom Field',
				name: 'custom_field',
				values: [
					{
						displayName: 'Name',
						name: 'data',
						type: 'options',
						typeOptions: {
							loadOptionsMethod,
						},
						default: '',
						required: true,
					},
					// {
					// 	displayName: 'Enum ID',
					// 	name: 'enum_id',
					// 	type: 'number',
					// 	default: null,
					// },
					// {
					// 	displayName: 'Enum Code',
					// 	name: 'enum_code',
					// 	type: 'string',
					// 	default: '',
					// },
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};
};

export const makeCustomFieldReqObject = (customFieldsValues: ICustomFieldValuesForm) => {
	return (
		customFieldsValues.custom_field?.reduce(
			(
				acc: Array<{
					field_id: number;
					values: Array<{
						value?: unknown;
						enum_id?: number;
						enum_code?: string;
					}>;
				}>,
				cf,
			) => {
				if (!cf.data || cf.value === '' || cf.value === null || cf.value === undefined) return acc;

				let data: { id: number; type: ITypeField };
				try {
					data = JSON.parse(cf.data) as { id: number; type: ITypeField };
				} catch {
					return acc;
				}
				if (!Number.isFinite(data.id)) return acc;

				if (Array.isArray(cf.value)) {
					return [...acc, { field_id: data.id, values: cf.value }];
				}

				let value: unknown = typeof cf.value === 'object' ? cf.value : undefined;
				let enum_id: number | undefined;
				let enum_code: string | undefined;

				if (
					typeof cf.value === 'string' &&
					isJson(cf.value) &&
					!isNumber(cf.value) &&
					typeof JSON.parse(cf.value) !== 'boolean'
				) {
					const parsedValue = JSON.parse(cf.value) as unknown;
					if (Array.isArray(parsedValue)) {
						return [...acc, { field_id: data.id, values: parsedValue }];
					}
					value = parsedValue;
				}

				if (
					value === undefined &&
					typeof cf.value === 'string' &&
					['multiselect', 'radiobutton', 'category'].includes(data.type) &&
					cf.value.split(',').length > 1
				) {
					return [
						...acc,
						{
							field_id: data.id,
							values: stringToArray(cf.value).map((value) =>
								typeof value === 'number' ? { enum_id: value } : { value },
							),
						},
					];
				}

				switch (value === undefined ? data.type : undefined) {
					case 'checkbox':
						if (
							typeof cf.value === 'string' &&
							['нет', 'no', 'false', 'off'].includes(cf.value.toLowerCase())
						) {
							value = false;
							break;
						}
						value = Boolean(cf.value);
						break;
					case 'date':
						value = Number(cf.value);
						break;
					case 'date_time':
						value = Number(cf.value);
						break;
					case 'birthday':
						value = Number(cf.value);
						break;
					case 'text':
						value = String(cf.value);
						break;
					case 'numeric':
						value = String(cf.value);
						break;
					case 'textarea':
						value = String(cf.value);
						break;
					case 'price':
						value = String(cf.value);
						break;
					case 'streetaddress':
						value = String(cf.value);
						break;
					case 'tracking_data':
						value = String(cf.value);
						break;
					case 'monetary':
						value = String(cf.value);
						break;
					case 'url':
						value = String(cf.value);
						break;
					case 'select':
						if (isNumber(String(cf.value))) {
							enum_id = Number(cf.value);
						} else {
							value = String(cf.value);
						}
						break;
					case 'multiselect':
						if (isNumber(String(cf.value))) {
							enum_id = Number(cf.value);
						} else {
							value = String(cf.value);
						}
						break;
					case 'radiobutton':
						if (isNumber(String(cf.value))) {
							enum_id = Number(cf.value);
						} else {
							value = String(cf.value);
						}
						break;
					case 'category':
						if (isNumber(String(cf.value))) {
							enum_id = Number(cf.value);
						} else {
							value = String(cf.value);
						}
						break;
					case 'multitext':
						value = String(cf.value);
						break;
					case 'smart_address':
						value = String(cf.value);
						break;
					case 'legal_entity':
						value = JSON.parse(String(cf.value));
						break;
					case 'items':
						value = JSON.parse(String(cf.value));
						break;
					case 'linked_entity':
						value = JSON.parse(String(cf.value));
						break;
					case 'chained_list':
						value = JSON.parse(String(cf.value));
						break;
					case 'file':
						value = JSON.parse(String(cf.value));
						break;
					case 'payer':
						value = JSON.parse(String(cf.value));
						break;
					case 'supplier':
						value = JSON.parse(String(cf.value));
						break;
					default:
						break;
				}

				if (value === undefined && enum_id === undefined && enum_code === undefined) return acc;
				if (typeof value === 'number' && !Number.isFinite(value)) return acc;

				const fieldValue = { value, enum_id, enum_code };
				const existingRecord = acc.find((item) => item.field_id === data.id);
				if (existingRecord) {
					existingRecord.values.push(fieldValue);
				} else {
					acc.push({ field_id: data.id, values: [fieldValue] });
				}
				return acc;
			},
			[],
		) ?? []
	);
};
