import { IconFile, ICredentialType, INodeProperties } from 'n8n-workflow';

export class kommoWebhookSecretApi implements ICredentialType {
	name = 'kommoWebhookSecretApi';
	displayName = 'Kommo Webhook Secret API';
	documentationUrl = 'https://kommo.com/developers';
	icon = 'file:kommo_logo.svg' as IconFile;
	properties: INodeProperties[] = [
		{
			displayName: 'Webhook Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'A private random value of at least 32 characters used to authenticate incoming Kommo webhooks',
		},
	];
}
