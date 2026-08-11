# Contributing

Independent reviews, bug reports, tests, and focused pull requests are welcome.

## Before changing code

- Use a sandbox n8n instance and a Kommo trial or test account.
- Never commit tokens, client secrets, production payloads, customer data, or `.env` files.
- Keep the upstream attribution and MIT license intact.
- Create a branch for each fix or feature.

## Local checks

This project requires Node.js 22 or newer and pnpm 9.1 or newer.

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm test
```

`pnpm test` builds the package and runs the regression suite with mocked Kommo responses. It does
not replace a sandbox smoke test for write, delete, webhook, incoming-lead, or Salesbot operations.

## Pull requests

- Explain the observed problem and its practical impact.
- Include a regression test for bug fixes whenever possible.
- Keep unrelated refactors in separate pull requests.
- Update `CHANGELOG.md` when behavior or public operations change.
- State which n8n and Kommo environments were used for manual testing.

Throughput, distributed rate limiting, retries, idempotency, and queue-mode coordination require an
explicit design review; avoid presenting local benchmarks as production guarantees.
