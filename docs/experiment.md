# Authorized Benchmark Plan

## Phase 0: Access and Terms

Before automated collection:

1. Obtain explicit approval for backend quote automation.
2. Receive a dedicated API key and affiliate identifier.
3. Confirm rate limits, provider identifiers, and fee semantics.
4. Confirm that internal derived telemetry is permitted.

## Phase 1: Base Calibration

Run a bounded same-chain benchmark for USDC/USDT and USDC/WETH.

- Concurrency: 1.
- Normal cadence: one matrix every 30 minutes with jitter.
- Stable slippage request: 0.05 percent, equivalent to 5 bps.
- Volatile slippage request: 0.5 percent, equivalent to 50 bps.
- No affiliate fee.
- No wallet capable of signing.
- Capture expected output, minimum output, provider, gas estimate, expiry, latency, route tags, and server request ID.
- Discard approvals and full transaction calldata.

For synthetic roundtrip diagnostics, request the reverse quote from both:

1. the forward expected output; and
2. the forward `minAmountOut`.

Neither result is considered atomic or executable evidence.

## Calibration Gates

Pause the experiment if:

- HTTP success falls below 99 percent;
- rate-limit responses exceed 0.5 percent;
- provider identity is missing from more than 1 percent of successful routes;
- p95 quote-pair latency exceeds 5 seconds;
- core route availability falls below 95 percent;
- fee or output fields cannot be reconciled.

Retain Socket as a useful benchmark only if it either correlates with direct observations or repeatedly reveals a reproducible direct-liquidity coverage gap.

## Phase 2: Optional Inventory Benchmark

This phase is deferred until there is profitable, prepositioned execution on more than one chain and a measured inventory deficit.

The first corridor would compare native USDC between Base and Arbitrum using Socket-filtered CCTP, Across, and Relay quotes against synchronized direct-provider quotes. It remains planning telemetry and cannot initiate transfers.

## Data Retention

Allowed fields include timestamps, chain and token identifiers, integer amounts, provider, fees, gas estimates, latency, expiry, route tags, sanitized error classes, and server request IDs.

Disallowed fields include credentials, private endpoints, signatures, full approval payloads, full transaction calldata, and wallet secrets.
