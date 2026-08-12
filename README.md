# n8n-nodes-kommo-toolkit

An extended n8n community-node toolkit for the [Kommo API](https://developers.kommo.com/). It
keeps the original Kommo node compatible while adding native resources, a webhook trigger,
batch-oriented writes, and a guarded API escape hatch so workflows need fewer hand-built HTTP
Request nodes.

Version `0.3.0-beta.1` builds on the original
[`n8n-nodes-kommo`](https://github.com/yatolstoy/n8n-nodes-kommo) project and uses its own npm package
identity so it can be installed directly from n8n as an unverified community package.
The original project was created by Yaroslav Tolstoy and is licensed under the MIT License. This
toolkit preserves that copyright notice and documents its additional changes in the changelog.

## Nodes

| Node              | Purpose                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| **Kommo**         | 68 configured operations across 18 resources                                |
| **Kommo Trigger** | Registers and removes Kommo webhooks with the n8n workflow lifecycle        |
| **Kommo Bulk**    | Creates or updates entities in batches of up to 50 items                    |
| **Kommo API**     | Calls a safe path relative to `/api/v4` using the selected Kommo credential |

All four nodes support OAuth2 and long-lived-token credentials. The public package prefix is
`n8n-nodes-kommo-toolkit`, while the underlying node names and credential types remain familiar.
Do not install this toolkit alongside another Kommo community package that exposes the same
credential types.

## Operations

| Resource       | Operations                                                            |
| -------------- | --------------------------------------------------------------------- |
| Account        | Get info                                                              |
| Company        | Create, get, update                                                   |
| Contact        | Create, get, update                                                   |
| Custom Field   | Create, delete, get, get many, update                                 |
| Entity Link    | Get many, link, unlink                                                |
| Event          | Get, get many, get types                                              |
| Incoming Lead  | Accept, add call, add form, decline, get, get many, get summary, link |
| Lead           | Create, get, update                                                   |
| List           | Create, get, update, create element, get elements, update elements    |
| Note           | Create, get, update                                                   |
| Pipeline       | Create, delete, get, get many, update                                 |
| Pipeline Stage | Create, delete, get, get many, update                                 |
| Salesbot       | Get, get many, run, stop                                              |
| Source         | Create, delete, get, get many, update                                 |
| Tag            | Create, get many, replace on entity                                   |
| Task           | Create, get, update                                                   |
| User           | Get, get many                                                         |
| Webhook        | Create, delete, get many                                              |

See [the detailed operation catalog](docs/OPERATION-CATALOG.md) for endpoint coverage and the few
places where variable Kommo structures still use JSON.

## Installation

Install the published package in a self-hosted n8n instance:

1. Open **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-kommo-toolkit`.
4. Accept the warning for unverified community code and select **Install**.

For local development, build and test it from the source directory:

```bash
pnpm install
pnpm test
pnpm pack
```

Install the resulting `.tgz` only in a self-hosted n8n test instance. Do not install this toolkit
and the upstream package in the same instance because both expose the original Kommo credential
types.

Existing workflows created with `n8n-nodes-kommo` are not silently rewritten to the new
`n8n-nodes-kommo-toolkit` package prefix. Test new workflows in the sandbox or migrate exported
workflow JSON deliberately after making a backup.

For a guided smoke test, use [docs/GUIA-DE-PRUEBAS.md](docs/GUIA-DE-PRUEBAS.md).

## Credentials

Create a Kommo account [here](https://www.kommo.com/). A trial account is suitable for workflow
testing.

### OAuth2

1. In n8n, create a Kommo OAuth2 credential and copy its OAuth Redirect URL.
2. In Kommo, create an integration under `https://your-domain.kommo.com/settings/widgets/`.
3. Paste the n8n redirect URL into the integration's redirect-link field.
4. Save the integration and copy its Integration ID and Secret Key into n8n.
5. Enter only the account subdomain: omit the protocol and `.kommo.com`.
6. Connect and authorize the Kommo account.

### Long-lived token

Create a Kommo long-lived-token credential with the token and account subdomain. The transport
rejects domains, URLs, dots, and paths in the subdomain field before making a request.

## Usage notes

- **Kommo Trigger** needs Kommo administrator rights, a publicly reachable HTTPS production webhook
  URL, and a dedicated **Kommo Webhook Secret API** credential containing at least 32 random
  characters. n8n stores the value as credential data; Kommo receives it only as part of its
  registered destination. The node rejects events without it and removes it from output metadata.
- **Kommo Bulk** accepts incoming n8n items or a JSON array. It caps batches at 50, removes empty
  values optionally, and preserves `pairedItem` links to source items.
- **Kommo API** accepts only relative API paths. Protocols, parent traversal, backslashes, query
  strings, and fragments in the endpoint field are rejected. Put query parameters in **Query JSON**.
- Variable Kommo payloads such as incoming form/call leads, source services, and uncommon custom
  field enums remain JSON parameters; routine IDs, filters, resources, and actions are configured
  controls.
- The request scheduler from `0.1.0` remains unchanged in this functionality release. Throughput
  and distributed rate limiting should be designed and benchmarked separately.

Test write and delete operations against a Kommo sandbox before using production data.

## Compatibility

- Node.js 22 or newer
- pnpm 9.1 or newer
- n8n community-node API metadata version 1
- Strict `@n8n/node-cli` build and lint rules

Community-node installation must be enabled by the n8n administrator. Queue-mode installations
must make the package available to the main process and every worker.

## Development

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm test
```

`pnpm test` performs a clean n8n-node build and runs the Node.js regression suite. The automated
tests mock Kommo HTTP responses; they do not modify a real Kommo account.

## Version history

See [CHANGELOG.md](CHANGELOG.md) for fixes, additions, and migration notes.

## Resources

- [Toolkit source and issue tracker](https://github.com/gessuvik/n8n-nodes-kommo-toolkit)
- [Kommo API reference](https://developers.kommo.com/reference)
- [Kommo webhooks](https://developers.kommo.com/docs/webhooks-1)
- [Kommo limitations and recommendations](https://developers.kommo.com/docs/limitations-and-recommendations)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Attribution and upstream

Upstream links are preserved for attribution; toolkit-specific issues should not be reported as
upstream defects without reproducing them on the original package.

Contributions and independent audits are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) before
opening a pull request.

- [GitHub issues](https://github.com/yatolstoy/n8n-nodes-kommo/issues)
- [Telegram](https://t.me/yatolstoy)
- [Donation from Russia](https://yoomoney.ru/to/410012112222938)
- [Donation from other countries](https://appstart.easystaff.io/easylancer/yatolstoy)
