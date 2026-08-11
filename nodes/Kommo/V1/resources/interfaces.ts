import { AllEntities, Entity, PropertiesOf } from 'n8n-workflow';

type IKommoMap = {
	account: 'getInfo';
	leads: 'getLeads' | 'createLeads' | 'updateLeads';
	contacts: 'getContacts' | 'createContacts' | 'updateContacts';
	companies: 'getCompany' | 'createCompany' | 'updateCompany';
	notes: 'getNotes' | 'createNotes' | 'updateNotes';
	customFields: 'getMany' | 'get' | 'create' | 'update' | 'remove';
	entityLinks: 'getMany' | 'link' | 'unlink';
	events: 'getMany' | 'get' | 'getTypes';
	incomingLeads:
		| 'getMany'
		| 'get'
		| 'addForm'
		| 'addCall'
		| 'accept'
		| 'decline'
		| 'link'
		| 'getSummary';
	pipelines: 'getMany' | 'get' | 'create' | 'update' | 'remove';
	pipelineStages: 'getMany' | 'get' | 'create' | 'update' | 'remove';
	salesbots: 'getMany' | 'get' | 'run' | 'stop';
	sources: 'getMany' | 'get' | 'create' | 'update' | 'remove';
	tags: 'getMany' | 'create' | 'replaceOnEntity';
	tasks: 'getTasks' | 'createTasks' | 'updateTasks';
	users: 'getMany' | 'get';
	webhooks: 'getMany' | 'create' | 'remove';
	lists:
		| 'getLists'
		| 'addLists'
		| 'updateLists'
		| 'getListElements'
		| 'addListElements'
		| 'updateListElements';
};

export type IKommo = AllEntities<IKommoMap>;

export type IAccountKommo = Entity<IKommoMap, 'account'>;
export type ILeadsKommo = Entity<IKommoMap, 'leads'>;
export type IContactsKommo = Entity<IKommoMap, 'contacts'>;
export type ICompaniesKommo = Entity<IKommoMap, 'companies'>;
export type ICustomFieldsKommo = Entity<IKommoMap, 'customFields'>;
export type IEntityLinksKommo = Entity<IKommoMap, 'entityLinks'>;
export type IEventsKommo = Entity<IKommoMap, 'events'>;
export type IIncomingLeadsKommo = Entity<IKommoMap, 'incomingLeads'>;
export type IPipelinesKommo = Entity<IKommoMap, 'pipelines'>;
export type IPipelineStagesKommo = Entity<IKommoMap, 'pipelineStages'>;
export type ISalesbotsKommo = Entity<IKommoMap, 'salesbots'>;
export type ISourcesKommo = Entity<IKommoMap, 'sources'>;
export type ITagsKommo = Entity<IKommoMap, 'tags'>;
export type ITasksKommo = Entity<IKommoMap, 'tasks'>;
export type IUsersKommo = Entity<IKommoMap, 'users'>;
export type IWebhooksKommo = Entity<IKommoMap, 'webhooks'>;
export type INotesKommo = Entity<IKommoMap, 'notes'>;
export type IListsKommo = Entity<IKommoMap, 'lists'>;

export type IAccountProperties = PropertiesOf<IAccountKommo>;
export type ILeadsProperties = PropertiesOf<ILeadsKommo>;
export type IContactsProperties = PropertiesOf<IContactsKommo>;
export type ICompaniesProperties = PropertiesOf<ICompaniesKommo>;
export type ICustomFieldsProperties = PropertiesOf<ICustomFieldsKommo>;
export type IEntityLinksProperties = PropertiesOf<IEntityLinksKommo>;
export type IEventsProperties = PropertiesOf<IEventsKommo>;
export type IIncomingLeadsProperties = PropertiesOf<IIncomingLeadsKommo>;
export type IPipelinesProperties = PropertiesOf<IPipelinesKommo>;
export type IPipelineStagesProperties = PropertiesOf<IPipelineStagesKommo>;
export type ISalesbotsProperties = PropertiesOf<ISalesbotsKommo>;
export type ISourcesProperties = PropertiesOf<ISourcesKommo>;
export type ITagsProperties = PropertiesOf<ITagsKommo>;
export type ITasksProperties = PropertiesOf<ITasksKommo>;
export type IUsersProperties = PropertiesOf<IUsersKommo>;
export type IWebhooksProperties = PropertiesOf<IWebhooksKommo>;
export type INotesProperties = PropertiesOf<INotesKommo>;
export type IListsProperties = PropertiesOf<IListsKommo>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
