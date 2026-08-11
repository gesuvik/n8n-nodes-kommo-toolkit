import { INodeTypeBaseDescription } from 'n8n-workflow';
import { KommoV1 } from './V1/KommoV1';

export class Kommo extends KommoV1 {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Kommo',
			name: 'kommo',
			icon: 'file:kommo_logo.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Sends data to Kommo',
		};

		super(baseDescription);
	}
}
