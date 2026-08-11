import {
	IconFile,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

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
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: `=https://{{$credentials.subdomain}}.kommo.com/api/v4/`,
			url: 'account',
		},
	};

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			authorization: `Bearer ${credentials.apiKey}`,
		};
		return requestOptions;
	}
}
