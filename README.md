# Kommo Toolkit for n8n

An extended n8n community-node toolkit for the [Kommo CRM](https://www.kommo.com/) that turns your sales pipeline into ordinary n8n building blocks. Manage leads, contacts, companies, tasks, pipelines, and notes — plus respond to events and push bulk changes — without hand-building HTTP Request nodes.

It builds on the original [`n8n-nodes-kommo`](https://github.com/yatolstoy/n8n-nodes-kommo) project, keeps the familiar node and credential types, and ships under its own package identity so it installs directly from n8n as an unverified community package.

## What's inside

Four nodes cover the full automation surface:

| Node              | What it does                                                                    |
| ----------------- | ------------------------------------------------------------------------------- |
| **Kommo**         | 68 configured operations across 18 resources                                    |
| **Kommo Trigger** | Registers and removes Kommo webhooks with the n8n workflow lifecycle            |
| **Kommo Bulk**    | Creates or updates entities in batches of up to 50 items                        |
| **Kommo API**     | Calls a safe path relative to `/api/v4` using the selected Kommo credential     |

All four nodes support OAuth2 and long-lived-token credentials.

## What you can do with it

- **Work the pipeline end to end.** Create, read, and update leads, contacts, companies, notes, tasks, pipelines, and pipeline stages.
- **Handle incoming leads.** Accept, decline, and enrich incoming leads, including form and call sources, and link them to contacts and companies.
- **React to events in real time.** Trigger workflows from Kommo webhooks with automatic registration and cleanup.
- **Push bulk changes.** Create or update up to 50 entities per batch, with optional empty-value cleanup and preserved source links.
- **Reach any endpoint when you need it.** A guarded escape hatch resolves relative API paths safely, so edge cases don't force you back to raw HTTP Request nodes.
- **Automate salesbots and custom fields.** Run and stop salesbots, and manage custom fields, tags, sources, and entity links.

## Getting started

### 1. Install

In n8n, open **Settings → Community Nodes**, choose **Install**, and enter:

```
n8n-nodes-kommo-toolkit
```

Accept the warning for unverified community code and confirm.

Do not install this toolkit alongside another Kommo community package that exposes the same credential types, since both define the original Kommo credential.

### 2. Create a credential

**OAuth2**

1. In n8n, create a Kommo OAuth2 credential and copy its OAuth Redirect URL.
2. In Kommo, create an integration under `https://your-domain.kommo.com/settings/widgets/`.
3. Paste the n8n redirect URL into the integration's redirect-link field.
4. Save the integration and copy its Integration ID and Secret Key into n8n.
5. Enter only the account subdomain — omit the protocol and `.kommo.com`.
6. Connect and authorize the account.

**Long-lived token**

Create a Kommo long-lived-token credential with the token and account subdomain. The transport validates the subdomain field before making any request.

### 3. Build your first workflow

Add a **Kommo Trigger** or any trigger, then add a **Kommo** node, pick a resource and operation, map fields, and execute. A trial Kommo account is enough to test workflows.

## Operational notes

- **Kommo Trigger** requires administrator rights, a publicly reachable HTTPS webhook URL, and a dedicated **Kommo Webhook Secret API** credential with at least 32 random characters. Events without the secret are rejected and the secret is stripped from output metadata.
- **Kommo Bulk** accepts incoming n8n items or a JSON array, caps batches at 50, optionally removes empty values, and preserves `pairedItem` links.
- **Kommo API** accepts only relative API paths. Protocols, parent traversal, backslashes, query strings, and fragments are rejected in the endpoint field; put query parameters in **Query JSON**.
- A few variable Kommo structures — incoming form and call leads, source services, and uncommon custom-field enums — remain JSON parameters; routine IDs, filters, resources, and actions are configured controls.

Test write and delete operations against a Kommo sandbox before touching production data.

## Compatibility

- Node.js 22 or newer
- pnpm 9.1 or newer
- n8n community-node API metadata version 1
- Strict `@n8n/node-cli` build and lint rules

Community-node installation must be enabled by the n8n administrator, and queue-mode installations must make the package available to the main process and every worker.

## For developers

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm test
pnpm pack
```

`pnpm test` performs a clean n8n-node build and runs the regression suite. The tests mock Kommo HTTP responses and do not modify a real Kommo account.

Install the resulting `.tgz` only in a self-hosted n8n test instance. Workflows created with the upstream `n8n-nodes-kommo` package are not silently rewritten to the new package prefix — test new workflows in a sandbox or migrate exported workflow JSON deliberately, after a backup.

See [the operation catalog](docs/OPERATION-CATALOG.md) for endpoint coverage and the [smoke-test guide](docs/GUIA-DE-PRUEBAS.md).

## Version history

See [CHANGELOG.md](CHANGELOG.md) for fixes, additions, and migration notes.

## Resources

- [Toolkit source and issue tracker](https://github.com/gesuvik/n8n-nodes-kommo-toolkit)
- [Kommo API reference](https://developers.kommo.com/reference)
- [Kommo webhooks](https://developers.kommo.com/docs/webhooks-1)
- [Kommo limitations and recommendations](https://developers.kommo.com/docs/limitations-and-recommendations)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Attribution and upstream

The original project was created by Yaroslav Tolstoy and is licensed under the MIT License. This toolkit preserves that copyright notice and documents its additional changes in the changelog. Upstream links are kept for attribution; toolkit-specific issues should not be reported as upstream defects without reproducing them on the original package.

Contributions and independent audits are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.
