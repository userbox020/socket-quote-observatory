# API Access Use Case

## Summary

Socket Quote Observatory is an internal, non-custodial, backend research service. It will compare low-frequency Socket Swap V3 quotes with direct onchain and provider quotes on Base and Arbitrum.

## Intended API Use

- Backend service only.
- Dedicated Socket endpoint and server-side API key.
- Concurrency one with a conservative cadence.
- Initial same-chain USDC/USDT and USDC/WETH calibration.
- Later Base/Arbitrum native-USDC bridge comparison only if operationally justified.

## Explicit Exclusions

- No signing, approvals, transaction submission, or wallet custody.
- No execution of returned OpenRouter calldata.
- No persistence of full transaction calldata.
- No cross-chain arbitrage.
- No resale or standalone redistribution of Socket data.
- No production trading dependency during the research phase.

## Requested Clarifications

- Authorization for automated internal quote-only use.
- Dedicated API credentials and affiliate identifier.
- Applicable request limits and service expectations.
- Fee semantics when `feeBps` is omitted.
- Stability of provider IDs used by `includeProvider`.
