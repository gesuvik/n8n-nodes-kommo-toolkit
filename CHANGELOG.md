# Changelog

All notable changes to this project are documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows semantic
versioning.

## [Unreleased]

### Fixed

- Constrain credential tests, OAuth token exchange, authenticated API calls, and cross-origin
  redirects to validated `*.kommo.com` account domains.
- Reject encoded traversal and non-path input in the advanced API node and validate dynamic list
  IDs before constructing requests.
- Return individual leads, contacts, companies, tasks, notes, catalogs, and catalog elements when
  paginating legacy `Return All` operations.
- Preserve each original n8n input index when empty Bulk items are removed before batching.
- Reconcile Trigger registrations when event settings change or Kommo marks a webhook disabled.
- Add regression coverage for every urgent audit blocker above.
- Serialize Lead pipeline and status filters using Kommo's current paired filter contract.
- Make structured Task updates opt-in, validate required creation deadlines, and require result text
  when completing tasks.
- Add missing entity/note IDs to call-note forms and route note queries through entity-specific API
  paths when entity IDs are supplied.
- Preserve RFC-3339 Custom Field dates, provide valid multitext enum metadata, and restrict field
  definition types to supported entities.
- Convert Lead closure dates during updates, keep omitted List booleans untouched, and reject Entity
  Link pairs or metadata that Kommo does not support.
- Remove obsolete structured filters, entity types, list types, and expansion options from Contacts,
  Companies, Tasks, and Lists; add contact/company restoration webhook events.
- Keep authentication selection node-wide and require a private 32-character secret for Trigger
  registration and every incoming webhook request.

### Migration notes

- Existing Trigger workflows must configure a new **Webhook Secret** of at least 32 characters and
  reactivate the workflow so the secured Kommo webhook replaces its legacy registration.

## [0.2.0] - 2026-08-11

### Added

- Three dedicated node types:
  - **Kommo Trigger**, with automatic webhook existence checks, registration, and deletion.
  - **Kommo Bulk**, with create/update batches of up to 50 leads, contacts, companies, tasks, or
    list elements and source-item pairing.
  - **Kommo API**, a guarded authenticated escape hatch for API v4 endpoints not yet represented by
    a configured operation.
- 46 configured operations across 11 new resources: custom fields, entity links, events, incoming
  leads, pipelines, pipeline stages, Salesbots, sources, tags, users, and webhooks.
- A total catalog of 68 operations across 18 resources in the main Kommo node.
- Native incoming-lead actions for form/call creation, acceptance, decline, linking, lookup, and
  summary retrieval.
- Native pipeline and stage administration, including optional stage descriptions.
- Native webhook event selection for lead, contact, company, task, talk, message, note, and chat
  template events.
- JSON parsing helpers that report invalid parameters as indexed n8n operation errors.
- Node metadata and documentation links for every new node type.
- Five toolkit regression tests covering node discovery, operation count, endpoint security,
  authenticated API requests, batch splitting, item pairing, and webhook lifecycle behavior.

### Changed

- Renamed the publishable package to `n8n-nodes-kommo-toolkit` and updated all four node metadata
  records to use that package prefix.
- Added public npm publication metadata and a regression check for package identity, node metadata,
  and the published-file allowlist.
- Removed the CLI-managed release guard from the npm lifecycle so the prevalidated tarball can be
  published directly with `npm publish <archivo.tgz> --access public`.
- Expanded the package manifest from one to four visible n8n node entry points.
- Improved dynamic-option help text and added themed icon metadata for the new nodes.
- Documented the private-package test workflow, native-operation catalog, and production caveats.
- Kept the underlying node names and Kommo credential types, while giving the public package its
  own n8n type prefix to avoid claiming ownership of the upstream npm package.

### Fixed

- Prevent advanced API endpoints from injecting domains, traversal, query strings, fragments, or
  backslash-separated paths.
- Preserve `pairedItem` metadata for every successful or failed bulk entity.
- Normalize HAL `_embedded` collections across single-page and paginated responses.
- Return explicit success objects for delete and empty-response actions.
- Use the collection update shape required by Kommo when replacing entity tags.
- Use the catalog custom-field collection endpoint and include the field ID in list-field updates.
- Remove duplicated dynamic-option help text introduced by automated lint migrations.

### Not changed

- The conservative per-process request scheduler remains at a 150 ms minimum interval. High-load
  rate control, retry policy, and multi-worker coordination are intentionally deferred to the
  separate scaling workstream.

### Migration notes

- Do not install this toolkit alongside the upstream package in one n8n instance because both
  expose the original Kommo credential types.
- Existing workflows using the `n8n-nodes-kommo.*` type prefix are not automatically rewritten to
  `n8n-nodes-kommo-toolkit.*`; create sandbox workflows or migrate exported JSON after a backup.
- Webhook registration requires an administrator-authorized Kommo credential and an active n8n
  production webhook URL.
- Test create, update, delete, incoming-lead, and Salesbot operations against a sandbox account
  before production use.

## [0.1.0] - 2026-08-11

### Added

- Lead source support through Kommo's `_embedded.source` payload (`external_id`, type `widget`).
- Eight regression tests covering payload cleanup, custom fields, item routing, caching, runtime
  loading, timestamp conversion, and subdomain validation.
- Scoped and deduplicated caching for dynamic n8n options.
- A request scheduler that observes Kommo's seven-requests-per-second limit without a third-party
  mutex dependency.
- Strict community-node metadata and modern n8n development commands.

### Changed

- Migrated the development toolchain to `@n8n/node-cli`, ESLint 9, TypeScript 5.9, and Node.js 22+.
- Updated package metadata, repository links, scripts, and the pnpm lockfile.
- Increased `Return All` page size to Kommo's maximum of 250 while hiding the unrelated `Limit`
  field in that mode.
- Made date conversion deterministic by flooring Unix timestamps and ignoring invalid dates.
- Made numeric parsing accept valid numeric strings such as `001` and reject empty or non-finite
  values.

### Fixed

- Use the current n8n input-item index in every operation instead of always reading item `0`.
- Stop wrapping operation results twice, which previously produced `json.json` output.
- Preserve the correct source item and paired-item metadata when `Continue On Fail` is enabled.
- Preserve arrays, `0`, and `false` while recursively removing empty values from API payloads.
- Skip blank or malformed custom-field entries and merge repeated values safely.
- Prevent dynamic option results from leaking between nodes, accounts, or parameter selections.
- Remove the dependency on `VersionedNodeType`, which caused loading failures in incompatible n8n
  runtimes.
- Make clean builds reproducible by removing a stale incremental cache that could report success
  without emitting JavaScript files.
- Validate Kommo subdomains before constructing request URLs.
- Correct list element IDs, task optional-number conversion, source/contact types, option ordering,
  and several redundant or unsafe expressions.

### Removed

- Legacy Gulp, TSLint, and `.eslintrc` tooling.
- The `async-await-mutex-lock` runtime dependency.
- The empty `index.js` package entry point.

### Migration notes

- Development now requires Node.js 22 or newer.
- Workflows that explicitly referenced nested output such as `$json.json.id` should use
  `$json.id` after upgrading.

## [0.0.16] - 2024-10-16

- Last upstream release before this audited update.
