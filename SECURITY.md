# Security Policy

## Scope

This repository is designed to remain non-custodial and quote-only. It must never require seed phrases, private keys, signing access, token approvals, or transaction submission permissions.

## Credential Handling

Future dedicated API credentials must be supplied through server-side environment variables. They must not be committed, logged, returned by APIs, embedded in client bundles, or included in issue reports.

## Executable Data

Socket responses may contain approval instructions and executable transaction calldata. The normalization boundary intentionally discards these fields. Full calldata must not be persisted, replayed, forwarded to a wallet, or admitted into an execution system.

The OpenRouter reference inspector accepts calldata only for in-memory classification. It emits hashes and structural metadata, never the original bytes, and every result has `executionAllowed: false`. A recognized selector or matching runtime hash does not validate recipients, fees, downstream targets, spenders, provider calldata, quote freshness, or economic safety.

## Reporting

Please report security concerns privately to the repository owner through GitHub. Do not include credentials, wallet secrets, private RPC URLs, or complete executable calldata in a report.
