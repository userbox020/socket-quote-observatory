# Socket GitHub Findings

Reviewed on 2026-07-12.

## No Self-Hosted Swap V3 Node

Socket's public organization does not contain the production Swap V3 quote, ranking, token-metadata, or status backend. There is no published Docker or compose stack that reproduces `public-backend.socket.tech` or `dedicated-backend.socket.tech`.

The historical SOCKET Protocol documentation says anyone can operate a Watcher node, but the current public repositories do not contain a reproducible Watcher VM or daemon, peer/bootstrap configuration, binary release, container image, or production operator runbook.

These are separate systems:

```text
Socket Swap / Bungee
  hosted quote backend -> AllowanceHolder -> OpenRouter -> provider

SOCKET Data Layer
  Watcher/AppGateway -> Transmitter -> Switchboard -> protocol contracts
```

Installing the Data Layer contracts does not provide Swap V3 quotes.

## Useful Repositories

| Repository | Useful material | Limitation |
| --- | --- | --- |
| [`openrouter`](https://github.com/SocketDotTech/openrouter) | Current contracts, ABIs, deployment hashes, security assumptions, fork tests, direct-provider E2E examples | Execution plumbing only; no quote backend |
| [`audits`](https://github.com/SocketDotTech/audits) | OpenRouter, Data Layer, SuperToken, and bridge audits | Security reference only |
| [`bungee-contracts-public`](https://github.com/SocketDotTech/bungee-contracts-public) | Bridge ABIs, deployments, simulations, Across/CCTP examples | Primarily older Gateway/Bungee architecture |
| [`socket-DL`](https://github.com/SocketDotTech/socket-DL) | Data Layer Solidity contracts and deployment/admin scripts | Separate protocol; no public node daemon or Swap routing |
| [`cctp-demo`](https://github.com/SocketDotTech/cctp-demo) | Direct CCTP reference | Future inventory research only |
| [`socket-v2-sdk`](https://github.com/SocketDotTech/socket-v2-sdk) | Historical client behavior | Archived and superseded by V3 |

## Pinned References

- OpenRouter commit: [`384b51a1a1e24bb469123c06f8f8bdc6e645f98a`](https://github.com/SocketDotTech/openrouter/commit/384b51a1a1e24bb469123c06f8f8bdc6e645f98a)
- Socket Data Layer commit: [`4df06c9eaf3fa1b65e51a6dd278dd4545814f523`](https://github.com/SocketDotTech/socket-DL/commit/4df06c9eaf3fa1b65e51a6dd278dd4545814f523)
- OpenRouter license: GPL-3.0-only

The observatory does not copy OpenRouter implementation code. It independently implements a narrow outer-envelope inspector from the published ABI and pins only factual selectors, addresses, hashes, and source metadata.

## Practical Direction

Use Socket as an authorized hosted benchmark. Build locally controlled quote-only comparators from official 0x, KyberSwap, OpenOcean, Across, CCTP, and Relay documentation. Treat OpenRouter as a security and drift reference, not as a quote engine or unrestricted execution adapter.
