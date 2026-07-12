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

See [the experiment specification](docs/experiment.md), [architecture](docs/architecture.md), and [Socket GitHub findings](docs/socket-github-findings.md).

## Offline Usage

Requires Node.js 20 or newer. The offline verifier uses the audited, dependency-free `@noble/hashes` package for Ethereum Keccak-256. No API credentials are needed.

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

## OpenRouter Reference Inspection

The package pins Socket's OpenRouter source and deployment metadata at commit [`384b51a`](https://github.com/SocketDotTech/openrouter/commit/384b51a1a1e24bb469123c06f8f8bdc6e645f98a).

```js
import {
  inspectAllowanceHolderTransaction,
  compareRuntimeBytecode
} from "./src/openrouter-reference.js";

const envelope = inspectAllowanceHolderTransaction({
  chainId: 8453,
  to: route.txData.object.to,
  data: route.txData.object.data
});

const runtimeComparison = compareRuntimeBytecode({
  chainId: 8453,
  contract: "openRouter",
  address: openRouterAddress,
  runtimeBytecode
});
```

The inspection result retains only hashes, lengths, selectors, addresses, and the outer amount. It does not return full calldata and always reports `executionAllowed: false`.

`outerEnvelopeCanonical` proves only that the outer `AllowanceHolder.exec` encoding is canonical. `referenceTargetsMatch` proves only that the pinned Base/Arbitrum addresses match. The inner OpenRouter ABI and provider calldata are deliberately not treated as validated.

## Non-Goals

- Transaction routing or wallet UX.
- Cross-chain arbitrage.
- A generic arbitrary-calldata executor.
- Replacing direct pool and provider validation.
- Claiming executable profit from sequential one-way quotes.
- Treating an OpenRouter selector, address, or bytecode match as execution approval.

## License

MIT
