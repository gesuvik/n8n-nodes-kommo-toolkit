import {
	IconFile,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { normalizeKommoSubdomain } from './kommoUrl';

const SAFE_SUBDOMAIN_EXPRESSION =
	'{{ /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test($credentials.subdomain) ? $credentials.subdomain : "www" }}';

export class kommoLongLivedApi implements ICredentialType {
	name = 'kommoLongLivedApi';
	displayName = 'Kommo Long-Lived Token API';
	documentationUrl = 'https://kommo.com/developers';
	icon = `file:kommo_logo.svg` as IconFile;
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
			displayName: 'Long-Lived Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
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

	test: ICredentialTestRequest = {
		request: {
			baseURL: `=https://${SAFE_SUBDOMAIN_EXPRESSION}.kommo.com/api/v4/`,
			url: 'account',
			allowedDomains: '*.kommo.com',
			sendCredentialsOnCrossOriginRedirect: false,
		},
	};

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const subdomain = normalizeKommoSubdomain(credentials.subdomain);
		requestOptions.headers = {
			...requestOptions.headers,
			authorization: `Bearer ${credentials.apiKey}`,
		};
		requestOptions.allowedDomains = `${subdomain}.kommo.com`;
		requestOptions.sendCredentialsOnCrossOriginRedirect = false;
		return requestOptions;
	}
}
