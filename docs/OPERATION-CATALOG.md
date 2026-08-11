# Kommo toolkit operation catalog

Version `0.2.0` exposes four n8n node types and 68 configured operations. Endpoint paths below are
relative to `https://{subdomain}.kommo.com/api/v4/`.

## Main Kommo node

| Resource       | Operations                                                            | API coverage                                            |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Account        | Get info                                                              | `account`                                               |
| Company        | Create, get, update                                                   | `companies`                                             |
| Contact        | Create, get, update                                                   | `contacts`                                              |
| Custom Field   | Create, delete, get, get many, update                                 | `{entity}/custom_fields`, `catalogs/{id}/custom_fields` |
| Entity Link    | Get many, link, unlink                                                | `{entity}/{id}/links`, `link`, `unlink`                 |
| Event          | Get, get many, get types                                              | `events`, `events/{id}`, `events/types`                 |
| Incoming Lead  | Accept, add call, add form, decline, get, get many, get summary, link | `leads/unsorted` and action endpoints                   |
| Lead           | Create, get, update                                                   | `leads`                                                 |
| List           | Create, get, update, create element, get elements, update elements    | `catalogs`, `catalogs/{id}/elements`                    |
| Note           | Create, get, update                                                   | `{entity}/notes`                                        |
| Pipeline       | Create, delete, get, get many, update                                 | `leads/pipelines`                                       |
| Pipeline Stage | Create, delete, get, get many, update                                 | `leads/pipelines/{id}/statuses`                         |
| Salesbot       | Get, get many, run, stop                                              | `bots` and action endpoints                             |
| Source         | Create, delete, get, get many, update                                 | `sources`                                               |
| Tag            | Create, get many, replace on entity                                   | `{entity}/tags`, `{entity}/{id}`                        |
| Task           | Create, get, update                                                   | `tasks`                                                 |
| User           | Get, get many                                                         | `users`                                                 |
| Webhook        | Create, delete, get many                                              | `webhooks`                                              |

## Dedicated nodes

### Kommo Trigger

The trigger subscribes to selected webhook event codes when a workflow is activated and removes
its destination when the workflow is deactivated. It can return either the request body alone or
the body with headers, query parameters, and receive time. A private secret of at least 32
characters is added to the registered destination and validated on every event; it is redacted from
the optional request metadata.

### Kommo Bulk

Supported targets:

- Leads
- Contacts
- Companies
- Tasks
- List elements

Supported actions are create and update. Input may come from incoming n8n items or a JSON array.
The batch-size control is limited to 50 even though Kommo accepts larger requests, following its
published recommendation.

### Kommo API

Supported HTTP methods are GET, POST, PATCH, and DELETE. The node handles Kommo credentials,
subdomain validation, the `/api/v4` prefix, optional query/body JSON, HAL pagination, and optional
`_embedded` collection extraction.

Use it for uncommon API v4 endpoints while keeping authentication and URL construction out of a
generic HTTP Request node.

## Intentionally flexible JSON parameters

Some structures vary enough between accounts or source types that a fixed UI would be more
restrictive than helpful:

- Incoming form and call lead arrays
- Incoming-lead link object
- Source service settings
- Custom-field enum arrays
- Pipeline-stage descriptions
- Advanced API query and request bodies

These parameters are parsed and validated before any HTTP request is made.
