# Architecture

## Purpose

The observatory provides an external quote benchmark, not an execution path. It answers whether a broad aggregator currently sees materially different one-way liquidity than direct quote sources.

## Planned Data Flow

```text
authorized low-frequency collector
  -> strict response validation
  -> executable-field removal
  -> integer-unit normalization
  -> direct quote comparison
  -> append-only research telemetry
```

The collector is intentionally separate from wallets, nonce managers, transaction builders, simulators, and trading processes.

## Trust Boundaries

Socket V3 identifies the upstream aggregator or bridge provider. It does not currently expose enough information to prove the underlying pool set, route split, fee tier, or quote block.

Therefore:

- Socket output is indicative external telemetry.
- Sequential forward and reverse quotes are synthetic observations, not atomic cycles.
- `expiresAt` is a wall-clock deadline, not a block reference.
- Direct provider or onchain evidence is required before investigating a venue integration.
- Executable fields are excluded at the first persistence boundary.

## Components

### Offline normalizer

Implemented in `src/normalize.js`. It validates integer amounts and important route metadata, selects the maximum-output route, and returns a reduced observation.

### Authorized collector

Not implemented while API authorization is pending. Its eventual requirements are:

- dedicated Socket backend and server-side key;
- concurrency one and conservative request cadence;
- explicit timeout and backoff behavior;
- capture of `server-req-id` for support;
- no status polling for unsubmitted quotes;
- no persistence of approval or transaction calldata.

### Comparator

Future offline logic will match observations with direct quotes by chain, pair, size, and local time/block bracket. It will report provider coverage and quote gaps without creating trade opportunities.

## Execution Isolation

There is no path from an observation to signing or submission. Any future direct venue integration must use a separately reviewed, narrowly scoped adapter with explicit token, recipient, spender, selector, deadline, minimum-output, and balance-delta validation.
