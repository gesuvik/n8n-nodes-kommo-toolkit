import { IconFile, ICredentialType, INodeProperties } from 'n8n-workflow';

export class kommoOAuth2Api implements ICredentialType {
	name = 'kommoOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Kommo OAuth2 API';
	documentationUrl = 'https://kommo.com/developers';
	icon = 'file:kommo_logo.svg' as IconFile;
	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			placeholder: 'mycompany',
			description: 'Account subdomain only, without protocol or .kommo.com',
			required: true,
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://www.kommo.com/oauth',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{ /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test($self["subdomain"]) ? "https://" + $self["subdomain"] + ".kommo.com/oauth2/access_token" : "https://www.kommo.com/oauth2/access_token" }}',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			placeholder: '********-****-****-****-************',
			description: 'ID integration from your Kommo account.',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Secret key from your integration in your Kommo account',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'grant_type=authorization_code',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'domains',
		},
		{
			displayName: 'Allowed Domains',
			name: 'allowedDomains',
			type: 'hidden',
			default: '*.kommo.com',
		},
	];
}
