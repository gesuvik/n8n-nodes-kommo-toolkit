/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	IExecuteFunctions,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';
import * as loadOptions from './methods';
import { router } from './resources/router';

import * as account from './resources/account';
import * as contacts from './resources/contacts';
import * as leads from './resources/leads';
import * as tasks from './resources/tasks';
import * as companies from './resources/companies';
import * as notes from './resources/notes';
import * as lists from './resources/lists';
import * as customFields from './resources/customFields';
import * as entityLinks from './resources/entityLinks';
import * as events from './resources/events';
import * as incomingLeads from './resources/incomingLeads';
import * as pipelines from './resources/pipelines';
import * as pipelineStages from './resources/pipelineStages';
import * as salesbots from './resources/salesbots';
import * as sources from './resources/sources';
import * as tags from './resources/tags';
import * as users from './resources/users';
import * as webhooks from './resources/webhooks';

export class KommoV1 {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'Kommo',
			name: 'kommo',
			icon: 'file:kommo_logo.svg',
			group: ['output'],
			version: 1,
			subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
			description: 'Consume Kommo API',
			defaults: {
				name: 'Kommo API Node',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'kommoOAuth2Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth2'],
						},
					},
				},
				{
					name: 'kommoLongLivedApi',
					required: true,
					displayOptions: {
						show: {
							authentication: ['longLivedToken'],
						},
					},
					testedBy: {
						request: {
							method: 'GET',
							url: 'account',
						},
					},
				},
			],
			properties: [
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Long Lived Token',
							value: 'longLivedToken',
						},
						{
							name: 'OAuth2',
							value: 'oAuth2',
						},
					],
					default: 'oAuth2',
				},
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Account',
							value: 'account',
						},
						{
							name: 'Company',
							value: 'companies',
						},
						{
							name: 'Contact',
							value: 'contacts',
						},
						{
							name: 'Custom Field',
							value: 'customFields',
						},
						{
							name: 'Entity Link',
							value: 'entityLinks',
						},
						{
							name: 'Event',
							value: 'events',
						},
						{
							name: 'Incoming Lead',
							value: 'incomingLeads',
						},
						{
							name: 'Lead',
							value: 'leads',
						},
						{
							name: 'List',
							value: 'lists',
						},
						{
							name: 'Note',
							value: 'notes',
						},
						{
							name: 'Pipeline',
							value: 'pipelines',
						},
						{
							name: 'Pipeline Stage',
							value: 'pipelineStages',
						},
						{
							name: 'Salesbot',
							value: 'salesbots',
						},
						{
							name: 'Source',
							value: 'sources',
						},
						{
							name: 'Tag',
							value: 'tags',
						},
						{
							name: 'Task',
							value: 'tasks',
						},
						{
							name: 'User',
							value: 'users',
						},
						{
							name: 'Webhook',
							value: 'webhooks',
						},
					],
					default: 'account',
				},
				...account.descriptions,
				...companies.descriptions,
				...contacts.descriptions,
				...leads.descriptions,
				...tasks.descriptions,
				...notes.descriptions,
				...lists.descriptions,
				...customFields.descriptions,
				...entityLinks.descriptions,
				...events.descriptions,
				...incomingLeads.descriptions,
				...pipelines.descriptions,
				...pipelineStages.descriptions,
				...salesbots.descriptions,
				...sources.descriptions,
				...tags.descriptions,
				...users.descriptions,
				...webhooks.descriptions,
			],
		};
	}

	methods = { loadOptions };

	async execute(this: IExecuteFunctions) {
		return router.call(this);
	}
}
