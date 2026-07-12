# Socket Quote Observatory

Socket Quote Observatory is a small, non-custodial research project for comparing normalized Socket Swap V3 quotes with direct onchain and provider quotes.

The initial research scope is Base and Arbitrum. The goal is to measure quote coverage, provider selection, latency, minimum-output behavior, and estimated costs without executing transactions.

## Authorization Status

Dedicated Socket API access is pending. This repository intentionally contains no Socket network client and performs no automated API requests.

After authorization, network collection will be implemented as a separate, low-frequency process using dedicated credentials and the limits agreed with Socket.

## Safety Boundaries

The project:

- does not contain a private key or wallet client;
- does not approve tokens, sign messages, or submit transactions;
- does not execute Socket `txData` or OpenRouter calldata;
- does not persist full transaction calldata;
- does not feed quotes into an arbitrage or trading executor;
- does not redistribute Socket data as a standalone product;
- redacts credentials and API endpoints from telemetry.

The current package accepts already-supplied response objects, validates their important fields, and emits a reduced observation that omits executable calldata.

## Initial Experiment

Phase 1 is a same-chain calibration on Base:

| Pair | Sizes | Purpose |
| --- | --- | --- |
| USDC to USDT and reverse | $0.25, $1, $2, $5 | Stable-asset coverage and minimum-output behavior |
| USDC to WETH and reverse | $0.25, $1, $2, $5 | Volatile route coverage and gas sensitivity |

Socket observations will be compared with direct, block-referenced quotes. Socket quotes are not treated as block-pinned because V3 does not expose a quote block.

Cross-chain Base/Arbitrum inventory-routing research is a later optional phase. It will not begin until the same-chain calibration passes and there is a demonstrated operational need.

See [the experiment specification](docs/experiment.md) and [architecture](docs/architecture.md).

## Offline Usage

Requires Node.js 20 or newer. No dependencies or API credentials are needed.

```bash
npm test
```

```js
import { normalizeSocketQuote } from "./src/normalize.js";

const observation = normalizeSocketQuote(socketResponse, {
  capturedAt: new Date().toISOString(),
  requestLatencyMs: 420,
  serverRequestId: "redacted-request-id"
});
```

The returned observation contains quote economics and provider metadata, but not `approval` or `txData`.

## Non-Goals

- Transaction routing or wallet UX.
- Cross-chain arbitrage.
- A generic arbitrary-calldata executor.
- Replacing direct pool and provider validation.
- Claiming executable profit from sequential one-way quotes.

## License

MIT
