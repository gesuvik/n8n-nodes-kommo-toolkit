import { ILinks } from './index';

export interface ILossReason {
	id: number;
	name: string;
	sort: number;
	created_at: number;
	updated_at: number;
	_links: ILinks;
}
